
const START = new Date(2011, 11, 10, 0, 0, 0);

const els = {
  exactYears: document.getElementById("exactYears"),
  completedYears: document.getElementById("completedYears"),
};

function compute() {
  const now = new Date();


  let y = now.getFullYear();
  const annivThisYear = new Date(y, 11, 10, 0, 0, 0);
  if (now < annivThisYear) y -= 1;

  const lastAnniv = new Date(y, 11, 10, 0, 0, 0);
  const nextAnniv = new Date(y + 1, 11, 10, 0, 0, 0);

  const completedYears = lastAnniv.getFullYear() - START.getFullYear();

 
  const fraction = (now - lastAnniv) / (nextAnniv - lastAnniv);
  const exactYears = completedYears + fraction;


  els.completedYears.textContent = String(completedYears);

  els.exactYears.textContent = exactYears.toFixed(9);
}

compute();
setInterval(compute, 1000);

/* skibidi toilet */