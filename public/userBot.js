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

  direction = getDirectionTo(currentPlayer, ballStop);
  velocity = data.settings.player.maxVelocity;

  if (data.playerIndex === 1) {
    let moveToX = ball.x > secondZoneStartX ? secondZoneStartX : ball.x;

    direction = getDirectionTo(currentPlayer, {x: moveToX, y: ball.y}); 
  }

  if (ballStop.x < currentPlayer.x) {
    // do not kick to the my goalpost, move to the position behind the ball
    const ballRadius = ball.settings.radius;
    var stopPoint = {
      x: ballStop.x - ballRadius * 2,
      y: ballStop.y + (ballStop.y > currentPlayer.y ? - ballRadius : + ballRadius) * 2
    }
    direction = getDirectionTo(currentPlayer, stopPoint);
    velocity = getDistance(currentPlayer, stopPoint);
  }

  return {
    direction: direction,
    velocity: velocity
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

onmessage = (e) => postMessage(getPlayerMove(e.data));
