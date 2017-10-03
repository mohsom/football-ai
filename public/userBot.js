//
// Aggresive strategy "run-and-kick"- all players run to ball and kick it if possible to any direction
//
'use strict';

function getPlayerMove(data) {
  // TODO : IMPLEMENT THE BETTER STRATEGY FOR YOUR BOT
  var currentPlayer = data.yourTeam.players[data.playerIndex];
  var ball = data.ball;

  var ballStop = getBallStats(ball, data.settings);

  var attackDirection = Math.atan2(ballStop.y - currentPlayer.y, ballStop.x - currentPlayer.x - ball.settings.radius);

  return {
    direction: attackDirection,
    velocity: currentPlayer.velocity + data.settings.player.maxVelocityIncrement
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

onmessage = (e) => postMessage(getPlayerMove(e.data));
