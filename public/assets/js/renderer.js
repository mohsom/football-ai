(function (window) {
  const score = document.querySelector('#score');
  const myBalls = ['ball-1', 'ball-2', 'ball-3', 'ball-4', 'ball-5', 'ball-6', 'ball-7']
    .map((id) => document.getElementById(id));
  const arrows = ['arrow-1', 'arrow-2', 'arrow-3', 'arrow-4', 'arrow-5', 'arrow-6', 'arrow-7']
    .map((id) => document.getElementById(id));


  const audioKick = new Audio('assets/audio/knee.wav');

  window.renderer = function (ev) {
    if (ev.kick) {
      // audioKick.cloneNode(false).play();
    }

    for (let i = 0; i < ev.data.length; i++) {
      const newX = ev.data[i].x - ev.data[i].settings.radius;
      const newY = ev.data[i].y - ev.data[i].settings.radius;
      let angle = ev.data[i].direction + Math.PI * 1.5;
      let velocity = ev.data[i].velocity * 5;

      if (angle < 0) angle += Math.PI * 2;

      myBalls[i].style.transform = `translate(${newX}px, ${newY}px) rotate(${angle}rad)`;
      arrows[i].style.height = velocity + 'px';
    }

    score.innerHTML = `${ev.teams[0].goal} - ${ev.teams[1].goal}`;
  };
})(window || {});
