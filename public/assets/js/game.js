/* ** worker.js ** */

const Game = {
  engine: null,
  bot1: null,
  bot2: null,
  gameHistory: [],
  logsPath: '',
  settings: {},
  callback: () => {},
  stateButton: document.querySelector('#state-button'),
  nextStepButton: document.querySelector('#next-step-button'),
  debugButton: document.querySelector('#debugButton'),
  speadButtons: document.querySelectorAll('.controls__button--spead'),
  playGame: false,
  isDebuging: false,
  gameSpead: 0,
  processMoves: false,

  normalizeAngle(radians, base) {
    if (radians > base) return radians - base;
    if (radians < 0) return radians + base;

    return radians;
  },

  sendPlayerMoveToEngine(ev, team) {
    if (!this.processMoves) return;

    const data = ev.data || {};

    this.engine.postMessage({
      type: 'playerMove',
      team,
      velocity: data.velocity,
      direction: data.direction,
    });
  },

  finishWork() {
    this.engine.terminate();
    if (this.bot1) this.bot1.terminate();
    if (this.bot2) this.bot2.terminate();
  },

  initBots(bot1Path, bot2Path) {
    if (bot1Path) {
      this.bot1 = new Worker(bot1Path);
      this.bot1.onmessage = (ev) => this.sendPlayerMoveToEngine(ev, 0);
    }

    if (bot2Path) {
      this.bot2 = new Worker(bot2Path);
      this.bot2.onmessage = (ev) => this.sendPlayerMoveToEngine(ev, 1);
    }
  },

  nextTick() {
    this.engine.postMessage({ type: 'continue' });
  },

  mirrorAngle(angle) {
    if (angle < Math.PI) return Math.PI - angle;

    return 3 * Math.PI - angle;
  },

  mirrorBall(ball) {
    return Object.assign({}, ball, {
      x: this.settings.field.width - ball.x,
      direction: this.mirrorAngle(ball.direction),
    });
  },

  mirrorTeam(team) {
    return Object.assign({}, team,
      {
         players: team.players.map((player) => this.mirrorBall(player)),
      }
    );
  },

  combineParamsForPlayer(basicParams, yourTeam, opponentTeam, ball) {
    const isGuest = (yourTeam.type === 'guest');

    return Object.assign({}, basicParams, {
      yourTeam: isGuest ? this.mirrorTeam(yourTeam) : yourTeam,
      opponentTeam: isGuest ? this.mirrorTeam(opponentTeam) : opponentTeam,
      ball: isGuest ? this.mirrorBall(ball) : ball,
    });
  },

  sendPosition(balls, teams, tick, playerIndex) {
    this.processMoves = true;
    const team1 = {
      type: teams[0].type,
      goals: teams[0].goal,
      players: balls.slice(0, 3),
    };
    const team2 = {
      type: teams[1].type,
      goals: teams[1].goal,
      players: balls.slice(3, 6),
    };
    const basicParams = {
      type: 'playerMove',
      settings:  {
        field: this.settings.field,
        player: this.settings.player,
        ball: this.settings.ball,
        periodDuration: this.settings.periodDuration, 
        tickDuration: this.settings.ticksDuration,
      },
      playerIndex,
      tick,
    };

    if (this.bot1) {
      this.bot1.postMessage(this.combineParamsForPlayer(
        basicParams, team1, team2, balls[6], playerIndex
      ));
    }

    if (this.bot2) {
      this.bot2.postMessage(this.combineParamsForPlayer(
        basicParams, team2, team1, balls[6], playerIndex
      ));
    }

    if (this.playGame) {
      setTimeout(() => {
        this.processMoves = false;
        this.nextTick();
      }, this.gameSpead);
    }
  },

  startMatch(callback) {
    console.log(' ---- ', 'start');
    this.callback = callback;
    this.engine.postMessage({ type: 'start' });
  },

  printDebugMessage(data) {
    console.group('Tick ', data.tick);
    for (let i = 0; i < data.data.length; i++) {
      const tick = data.data[i];
      console.group(i === 6 ? 'Ball ' : 'Player ' + i);
      console.log('Velocity: ', tick.velocity);
      console.log('Direction: ', tick.direction);
      console.log('Position X: ', tick.x);
      console.log('Position Y: ', tick.y);
      console.groupEnd('Player ', i);
    }
    console.groupEnd('Tick ', data.tick);
  },

  engineMessage(ev) {
    const data = ev.data;

    switch (data.type) {
      case 'move':
        if (this.isDebuging) this.printDebugMessage(data);
        if (window && window.renderer) window.renderer(ev.data);
        this.sendPosition(data.data, data.teams, data.tick,  data.playerIndex);
        break;

      case 'goal!':
        this.engine.postMessage({ type: data.type });
        break;

      case 'game over':
        this.finishWork();
        console.log('The end!');
        break;

      default:
        break;
    }
  },

  changeButtons(val) {
    [
      this.nextStepButton,
    ].forEach((item) => { item.disabled = val; });
  },

  stateButtonClick() {
    this.stateButton.innerText = !this.playGame ? 'Stop' : 'Start';

    if (this.playGame) {
      this.playGame = false;
      this.changeButtons(false);
      return;
    }

    this.playGame = true;
    this.changeButtons(true);
    this.nextTick();
  },

  nextStepButtonClick() {
    if (!this.playGame) {
      this.nextTick();
    }
  },

  debugButtonChange(ev) {
    this.isDebuging = ev.target.checked;
  },

  speedButtonClick(ev) {
    this.gameSpead = this.settings.tickDuration * ev.target.dataset.spead;
    this.speadButtons.forEach((item) => {
      if (item.dataset.spead === ev.target.dataset.spead) {
        item.className = item.className + ' active';
      } else {
        item.className = item.className.replace('active', '');
      }
    });
  },

  initGame(settings, bot1Path, bot2Path) {
    this.settings = settings;
    this.gameSpead = this.settings.tickDuration;

    this.stateButton.addEventListener('click', this.stateButtonClick.bind(this));
    this.nextStepButton.addEventListener('click', this.nextStepButtonClick.bind(this));
    this.debugButton.addEventListener('change', this.debugButtonChange.bind(this));

    this.speadButtons
      .forEach((item) => item.addEventListener('click', this.speedButtonClick.bind(this)));

    this.engine = new Worker('assets/js/engine.js');
    this.engine.onmessage = (ev) => this.engineMessage(ev);
    this.engine.postMessage({ type: 'init', settings });

    this.initBots(bot1Path, bot2Path);
  },
};

function getJSON(url, callback) {
  const xhr = new XMLHttpRequest();
  xhr.open('get', url, true);
  xhr.responseType = 'json';
  xhr.onload = function () {
    const status = xhr.status;
    if (status === 200) {
      callback(null, xhr.response);
    } else {
      callback(status);
    }
  };
  xhr.send();
}

getJSON('config.json', (err, settings) => {
  if (err) {
    window.console.error(err);
    return;
  }
  Game.initGame(settings, settings.bot1, settings.bot2);
  Game.startMatch();
});
