//
// Aggresive strategy "run-and-kick"- all players run to ball and kick it if possible to any direction
//
'use strict';

function getPlayerMove(data) {
  // TODO : IMPLEMENT THE BETTER STRATEGY FOR YOUR BOT
  var currentPlayer = data.yourTeam.players[data.playerIndex];
  var direction = currentPlayer.direction, 
      velocity = currentPlayer.velocity;

  var ball = data.ball;
  var ballStop = getBallStats(ball, data.settings);
  
  var secondZoneStartX = data.settings.field.width / 4;

  if (ballStop.x < currentPlayer.x) {
      return moveBehindTheBall(currentPlayer, ball, data);
  }

  if (data.playerIndex === 1) {
    // let moveToX = ball.x > secondZoneStartX ? secondZoneStartX : ball.x;
    // return moveToPoint(currentPlayer, {x: moveToX, y: ball.y}, data);

    let isBallInZone = ball.x <= secondZoneStartX,
        velocity, direction;

    let isPlayerInZone = currentPlayer.x <=secondZoneStartX;    

    velocity = data.settings.player.maxVelocity;

    let point = {
      x: isBallInZone ? ballStop.x : (isPlayerInZone ? currentPlayer.x : secondZoneStartX),
      y: ballStop.y
    };

    return {
      direction: getDirectionTo(currentPlayer, point),
      velocity
    }    
  } 

  return moveToPoint(currentPlayer, ball, data);
}

function moveBehindTheBall(currentPlayer, ball, data) {
  let ballStop = getBallStats(ball, data.settings);
  let direction, velocity;
  const ballRadius = ball.settings.radius;
  var stopPoint = {
    x: ballStop.x - ballRadius * 1.5,
    y: ballStop.y + (ballStop.y > currentPlayer.y ? - ballRadius : + ballRadius) * 1.5
  };

  return moveToPoint(currentPlayer, stopPoint);
}

function moveToPoint(player, point, data) {
    return {
      direction: getDirectionTo(player, point),
      velocity: getDistance(player, point)
    };
} 

function getBallStats(ball, gameSettings) {
  var stopTime = getStopTime(ball);
  var stopDistance = ball.velocity * stopTime
    - ball.settings.moveDeceleration * (stopTime + 1) * stopTime / 2;

  var x = ball.x + stopDistance * Math.cos(ball.direction);
  var y = Math.abs(ball.y + stopDistance * Math.sin(ball.direction));

  // check the reflection from field side
  if (y > gameSettings.field.height) y = 2 * gameSettings.field.height - y;

  return { stopTime, stopDistance, x, y };
}

function getStopTime(ball) {
  return ball.velocity / ball.settings.moveDeceleration;
}

function getDirectionTo(startPoint, endPoint) {
  return Math.atan2(endPoint.y - startPoint.y, endPoint.x - startPoint.x);
}

function getDistance(point1, point2) {
  return Math.hypot(point1.x-point2.x, point1.y - point2.y);
}

function getNearestToBall(players, ball) {
  let nearestToBall = players[0],
    minDistance = getDistance(nearestToBall, ball);

  for (let o of players) {
    if (getDistance(o, ball) < minDistance) {
      nearestToBall = o;
    }
  }
}

onmessage = (e) => postMessage(getPlayerMove(e.data));
