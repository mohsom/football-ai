/* ** engine.js ** */

const Engine = {
  intervalID: null,
  playerIndex: 0,
  tick: 0,
  settings: {},
  balls: [],
  kick: false,
  collisionDistance: 0,

  initGame(gameSettings) {
    this.settings = gameSettings;
    this.setupInitPosition();

    for (let i = 0; i < 6; i++) {
      this.balls[i].settings = this.settings.player;
    }

    this.balls[6].settings = this.settings.ball;
    this.collisionDistance = gameSettings.ball.radius * 2;
  },

  getSquareDistance(b1, b2) {
    return Math.pow((b1.x - b2.x), 2) + Math.pow((b1.y - b2.y), 2);
  },

  normalizeAngle(radians, base) {
    if (radians > base) return radians - base;
    if (radians < 0) return radians + base;

    return radians;
  },

  mirrorAngle(angle) {
    if (angle < Math.PI) return Math.PI - angle;

    return 3 * Math.PI - angle;
  },

  normalizeDirection(radians) {
    return this.normalizeAngle(radians, 2 * Math.PI);
  },


  verifyVelocity(playerVelocity, moveVelocity) {
    const maxInc = this.settings.player.maxVelocityIncrement;
    const maxVelocity = this.settings.player.maxVelocity;

    if (playerVelocity - moveVelocity > maxInc) {
      playerVelocity -= maxInc;
    } else if (moveVelocity - playerVelocity > maxInc) {
      playerVelocity += maxInc;
    } else {
      playerVelocity = moveVelocity;
    }

    if (playerVelocity > maxVelocity) return maxVelocity;
    if (playerVelocity < 0) return 0;

    return playerVelocity;
  },

  verifyDirection(playerDir, moveDir, maxInc) {
    moveDir = this.normalizeDirection(moveDir);
    const diff = this.normalizeDirection(moveDir - playerDir);

    if (diff < Math.PI) {
      if (diff < maxInc) return moveDir;

      return this.normalizeDirection(playerDir + maxInc);
    }

    if (2 * Math.PI - diff < maxInc) return moveDir;

    return this.normalizeDirection(playerDir - maxInc);
  },

  playerMove(moveData) {
    const move = moveData;
    const player = this.balls[move.team * 3 + this.playerIndex];

    if ((move.team !== 0) && (move.team !== 1)) return;

    const team = this.settings.teams[move.team];

    if (Number.isNaN(move.velocity) || !Number.isFinite(move.velocity)) return;
    player.velocity = this.verifyVelocity(player.velocity, move.velocity);

    if (Number.isNaN(move.direction) || !Number.isFinite(move.direction)) return;
    if (team.type === 'guest') {
      move.direction = this.mirrorAngle(move.direction);
    }

    const maxDirectionInc = Math.PI / (1 + player.velocity);
    player.direction = this.verifyDirection(
        player.direction,
        move.direction,
        maxDirectionInc
    );
  },

  sendMoveMessage() {
    postMessage({
      type: 'move',
      kick: this.kick,
      tick: this.tick,
      data: this.balls,
      playerIndex: this.playerIndex,
      teams: this.settings.teams,
    });

    this.kick = false;
  },

  moveBall(ball, num) {
    let newX = ball.x + (ball.velocity) * Math.cos(ball.direction);
    let newY = ball.y + (ball.velocity) * Math.sin(ball.direction);
    const radius = ball.settings.radius;
    const newBall = Object.assign({}, ball);

    if (newX <= radius) {
      if (num === 6) {
        newBall.canGoal = 2;
      }

      newX = 2 * radius - newX;
      newBall.direction = Math.PI - newBall.direction;
    }

    if (newY <= radius) {
      newY = 2 * radius - newY;
      newBall.direction = 2 * Math.PI - newBall.direction;
    }

    if (newX >= this.settings.field.width - radius) {
      if (num === 6) {
        newBall.canGoal = 1;
      }

      newX = 2 * (this.settings.field.width - radius) - newX;
      newBall.direction = Math.PI - newBall.direction;
    }

    if (newY >= this.settings.field.height - radius) {
      newY = 2 * (this.settings.field.height - radius) - newY;
      newBall.direction = 2 * Math.PI - newBall.direction;
    }

    newBall.x = newX;
    newBall.y = newY;

    if (ball.settings.moveDeceleration && (newBall.velocity > 0)) {
      newBall.velocity -= newBall.settings.moveDeceleration;

      if (newBall.velocity < 0) newBall.velocity = 0;
    }

    return newBall;
  },

  checkGoal() {
    const ball = this.balls[6];
    const check = ball.canGoal === 1
      ? (2 * (this.settings.field.width - ball.settings.radius) - ball.x)
      : (2 * ball.settings.radius - ball.x);

    if (ball.x <= ball.settings.radius ||
        ball.x >= this.settings.field.width - ball.settings.radius ||
        check <= ball.settings.radius ||
        check >= this.settings.field.width - ball.settings.radius) {
      return ball.canGoal;
    }

    return 0;
  },

  decomposeSpeedRelatedToAngle(ball, angle) {
    return {
      x: ball.velocity * Math.cos(ball.direction - angle),
      y: ball.velocity * Math.sin(ball.direction - angle),
    };
  },

  collisionDetection(num) {
    const b1 = this.balls[num];
    let b2;

    for (let i = num+1; i < this.balls.length; i++) {
      b2 = this.balls[i];

      let sdist = Math.hypot(b1.x - b2.x, b1.y - b2.y);
      if (sdist >= this.collisionDistance) continue;  

      const collision = {
        x: (b1.x + b2.x) / 2,
        y: (b1.y + b2.y) / 2,
        distance: (b1.settings.radius + b2.settings.radius - sdist) / 2,
        angle: Math.atan2(b2.y - b1.y, b2.x - b1.x),
      };

      const newSpeed1 = this.decomposeSpeedRelatedToAngle(b1, collision.angle);
      const newSpeed2 = this.decomposeSpeedRelatedToAngle(b2, collision.angle);

      const ballsSum = b1.settings.mass + b2.settings.mass;
      const ballsDiff = b1.settings.mass - b2.settings.mass;
      const finalSpeed1X = (ballsDiff * newSpeed1.x + ballsSum * newSpeed2.x) / ballsSum;
      const finalSpeed2X = (ballsSum * newSpeed1.x - ballsDiff * newSpeed2.x) / ballsSum;

      newSpeed1.x = finalSpeed1X;
      newSpeed2.x = finalSpeed2X;

      b1.velocity = Math.sqrt(newSpeed1.x * newSpeed1.x + newSpeed1.y * newSpeed1.y);
      b2.velocity = Math.sqrt(newSpeed2.x * newSpeed2.x + newSpeed2.y * newSpeed2.y);

      if (b1.velocity > b1.settings.maxVelocity) b1.velocity = b1.settings.maxVelocity;
      if (b2.velocity > b2.settings.maxVelocity) b2.velocity = b2.settings.maxVelocity;

      b1.direction = Math.atan2(newSpeed1.y, newSpeed1.x) + collision.angle;
      b2.direction = Math.atan2(newSpeed2.y, newSpeed2.x) + collision.angle;

      b1.direction = this.normalizeDirection(b1.direction);
      b2.direction = this.normalizeDirection(b2.direction);

      if (collision.distance <= 0) continue;

      const diff = {
        x: collision.distance * Math.cos(collision.angle),
        y: collision.distance * Math.sin(collision.angle),
      };

      b1.x -= diff.x;
      b1.y -= diff.y;

      b2.x += diff.x;
      b2.y += diff.y;

      if (b2.settings.kickAcceleration) {
        this.kick = true;
        b2.velocity += b2.settings.kickAcceleration;
        if (b2.velocity > b2.settings.maxVelocity) b2.velocity = b2.settings.maxVelocity;
      }

      if (num === 6) {
        if (b1.x <= b1.settings.radius) b1.canGoal = 2;
        if (b1.x >= this.settings.field.width - b1.settings.radius) b1.canGoal = 1;
      }
    }

    if (b1.canGoal) {
      return this.checkGoal();
    }

    return null;
  },

  processMoves() {
    let goal;

    for (let i = 0; i < this.balls.length; i++) {
      this.balls[i] = this.moveBall(this.balls[i], i);
    }

    for (let i = 0; i < this.balls.length; i++) {
      goal = this.collisionDetection(i);
      if (goal) break;
    }

    this.tick++;
    this.playerIndex = (this.playerIndex + 1) % 3;

    if (goal) {
      const goalType = goal === 2 ? 'guest' : 'home';
      this.settings.teams = this.settings.teams
        .map((team) => ((team.type === goalType)
          ? Object.assign({}, team, { goal: team.goal + 1 })
          : team
        ));

      postMessage({ type: 'goal!', team: goal, teams: this.settings.teams });
    } else {
      this.sendMoveMessage();
    }
  },

  setupInitPosition() {
    this.balls = [];

    const basicOffset = 100;
    const goolKeeperOffset = 50;
    const avarageOffset = 200;
    const horizSpaceBetweenPlayers = (this.settings.field.height - 2 * basicOffset) /
      (this.settings.playersInTeam - 1);

    for (let i1 = 0; i1 < this.settings.teams.length; i1++) {
      const team = this.settings.teams[i1];
      team.players = [];

      for (let i2 = 0; i2 < this.settings.playersInTeam; i2++) {
        const offset = i2 === 1 ? goolKeeperOffset : avarageOffset;
        const teamX = (team.type === 'home')
          ? offset
          : this.settings.field.width - offset;

        const player = {
          x: teamX,
          y: basicOffset + horizSpaceBetweenPlayers * i2,
          direction: team.direction,
          velocity: 0,
          settings: this.settings.player,
        };

        team.players.push(player);
        this.balls.push(player);
      }
    }

    this.balls.push({
      x: this.settings.field.width / 2,
      y: this.settings.field.height / 2,
      direction: Math.PI / 2,
      velocity: 0,
      settings: this.settings.ball,
    });
  },

  startGame() {
    this.playerIndex = 0;
    this.sendMoveMessage();
  },

  continueGame() {
    this.setupInitPosition();
    this.sendMoveMessage();
  },
};

onmessage = (ev) => {
  switch (ev.data.type) {
    case 'init':
      Engine.initGame(ev.data.settings);
      break;

    case 'continue':
      Engine.processMoves();
      break;

    case 'start':
      Engine.startGame();
      break;

    case 'goal!':
      Engine.continueGame();
      break;

    case 'playerMove':
      Engine.playerMove(ev.data);
      break;

    default:
      break;
  }
};
