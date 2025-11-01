const DOM = {
  colorPicker: document.getElementById("colorPicker"),
  colorDropdown: document.getElementById("colorDropdown"),
  hexInput: document.getElementById("hexInput"),
  randomBtn: document.getElementById("randomBtn"),
  hueSlider: document.getElementById("hueSlider"),
  satSlider: document.getElementById("satSlider"),
  lightSlider: document.getElementById("lightSlider"),
  numColorsDisplay: document.getElementById("numColorsDisplay"),
  colorGrid: document.getElementById("colorGrid"),
  decreaseColors: document.getElementById("decreaseColors"),
  increaseColors: document.getElementById("increaseColors"),
  contrastingTones: document.getElementById("contrastingTones"),
  textColorToggle: document.getElementById("textColorToggle")
};

let numColors = 3;
const MIN_COLORS = 2;
const MAX_COLORS = 4;

const colorWheel = [
  { name: "Red", hue: 5 },
  { name: "Red-Orange", hue: 15 },
  { name: "Orange", hue: 30 },
  { name: "Yellow-Orange", hue: 45 },
  { name: "Yellow", hue: 55 },
  { name: "Yellow-Green", hue: 75 },
  { name: "Green", hue: 140 },
  { name: "Blue-Green", hue: 200 },
  { name: "Blue", hue: 240 },
  { name: "Blue-Violet", hue: 265 },
  { name: "Violet", hue: 280 },
  { name: "Red-Violet", hue: 300 }
];

let isUpdating = false;
let currentScheme = "polychromatic";

const hexCache = new Map();

function hslToHex(h, s, l) {
  const key = `${h}-${s}-${l}`;
  if (hexCache.has(key)) return hexCache.get(key);

  s /= 100;
  l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) =>
    l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (x) =>
    Math.round(x * 255)
      .toString(16)
      .padStart(2, "0");

  const result = `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`.toUpperCase();
  hexCache.set(key, result);
  return result;
}

function hexToHsl(hex) {
  hex = hex.replace("#", "");
  const r = parseInt(hex.substr(0, 2), 16) / 255;
  const g = parseInt(hex.substr(2, 2), 16) / 255;
  const b = parseInt(hex.substr(4, 2), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h,
    s,
    l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  };
}

function getClosestColorName(hue) {
  let closest = colorWheel[0];
  let minDiff = 360;

  for (const color of colorWheel) {
    const diff = Math.min(
      Math.abs(hue - color.hue),
      360 - Math.abs(hue - color.hue)
    );
    if (diff < minDiff) {
      minDiff = diff;
      closest = color;
    }
  }
  return closest.name;
}

function getDescriptiveColorName(h, s, l) {
  if (l === 0) return "Black";
  if (l === 100) return "White";

  if (s === 0) {
    if (l <= 30) return "Dark Gray";
    if (l >= 70) return "Light Gray";
    return "Gray";
  }

  const parts = [];
  if (s <= 30) parts.push("Pale");
  else if (s >= 70) parts.push("Vivid");

  if (l <= 30) parts.push("Dark");
  else if (l >= 70) parts.push("Light");

  parts.push(getClosestColorName(h));
  return parts.join(" ");
}

function updateSliderBackgrounds(h, s) {
  DOM.hueSlider.style.setProperty(
    "--track-bg",
    "linear-gradient(90deg, #FF0000 0%, #FFA800 13%, #FFFF00 22%, #00FF00 34%, #00FFFF 50%, #0000FF 66%, #FF00FF 82%, #FF0000 100%)"
  );
  DOM.satSlider.style.setProperty(
    "--track-bg",
    `linear-gradient(90deg, hsl(${h},0%,50%) 0%, hsl(${h},100%,50%) 100%)`
  );
  DOM.lightSlider.style.setProperty(
    "--track-bg",
    `linear-gradient(90deg, hsl(${h},${s}%,0%) 0%, hsl(${h},${s}%,50%) 50%, hsl(${h},${s}%,100%) 100%)`
  );
}

function normalizeHue(hue) {
  hue = hue % 360;
  return hue < 0 ? hue + 360 : hue;
}

function updateAllInputs(h, s, l) {
  if (isUpdating) return;
  isUpdating = true;

  const hex = hslToHex(h, s, l);

  document.body.style.backgroundColor = hex;

  DOM.hueSlider.value = h;
  DOM.satSlider.value = s;
  DOM.lightSlider.value = l;
  DOM.hexInput.value = hex.replace("#", "");
  DOM.colorPicker.value = hex;

  let closestOption = 0,
    minDiff = 360;
  for (let i = 0; i < DOM.colorDropdown.options.length; i++) {
    const optionHue = parseInt(DOM.colorDropdown.options[i].value);
    const diff = Math.min(
      Math.abs(h - optionHue),
      360 - Math.abs(h - optionHue)
    );
    if (diff < minDiff) {
      minDiff = diff;
      closestOption = i;
    }
  }
  DOM.colorDropdown.selectedIndex = closestOption;

  updateSliderBackgrounds(h, s);
  generateColorScheme();

  isUpdating = false;
}

function generatePolychromatic(h, s, l, count) {
  const colors = [{ h, s, l }];
  const angles =
    count === 2 ? [180] : count === 3 ? [120, 240] : [90, 180, 270];

  if (DOM.contrastingTones.checked) {
    angles.forEach((angle, i) =>
      colors.push({
        h: normalizeHue(h + angle),
        s,
        l: (l + 20 * (i + 1)) % 100
      })
    );
  } else {
    angles.forEach((angle) =>
      colors.push({ h: normalizeHue(h + angle), s, l })
    );
  }

  return colors;
}

function generateMonochromatic(h, s, l, count) {
  const colors = [{ h, s, l }];

  if (DOM.contrastingTones.checked) {
    for (let i = 0; i < count - 1; i++) {
      colors.push({
        h,
        s,
        l: (l + 20 * (i + 1)) % 100
      });
    }
  } else {
    for (let i = 0; i < count - 1; i++) {
      colors.push({
        h,
        s,
        l: (l + 5 * (i + 1)) % 100
      });
    }
  }

  return colors;
}

function generateAnalogous(h, s, l, count) {
  const angles = count === 2 ? [20] : count === 3 ? [20, -20] : [20, -20, 10];
  const colors = [{ h, s, l }];

  if (DOM.contrastingTones.checked) {
    angles.forEach((angle, i) =>
      colors.push({
        h: normalizeHue(h + angle),
        s,
        l: (l + 20 * (i + 1)) % 100
      })
    );
  } else {
    angles.forEach((angle) =>
      colors.push({ h: normalizeHue(h + angle), s, l })
    );
  }

  return colors;
}

function generateColorScheme() {
  const h = parseInt(DOM.hueSlider.value);
  const s = parseInt(DOM.satSlider.value);
  const l = parseInt(DOM.lightSlider.value);

  const generators = {
    polychromatic: generatePolychromatic,
    monochromatic: generateMonochromatic,
    analogous: generateAnalogous
  };

  const colors = generators[currentScheme](h, s, l, numColors);
  displayColors(colors);

  const primary = colors[0];
  const primaryHex = hslToHex(primary.h, primary.s, primary.l);

  const last = colors[colors.length - 1];
  const lastHex = hslToHex(last.h, last.s, last.l);

  document.body.style.backgroundColor = primaryHex;

  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute("content", lastHex);
  }

 // const textL = primary.l > 50 ? 0 : 100;
const textL =
  primary.l < 10 ? 100 - (primary.l / 10) * 10 :                 // 0→10: 100→90
  primary.l < 40 ? 90 :                                        // 10→40: constant 90
  primary.l < 50 ? 90 + ((primary.l - 40) / 10) * 10 :           // 40→50: 90→100
  primary.l === 50 ? 0 :                                       // 50: hard break
  primary.l < 60 ? 0 :                                         // 50→60: constant 0
  primary.l < 90 ? ((primary.l - 60) / 30) * 10 :                // 60→90: 0→10
  10 - ((primary.l - 90) / 10) * 10;                           // 90→100: 10→0

  
  const textColor = hslToHex(primary.h, primary.s, textL);
  document.documentElement.style.setProperty("--text-color", textColor);
}

function displayColors(colors) {
  const fragment = document.createDocumentFragment();
const mode = DOM.textColorToggle.checked ? "text" : "palette";
  const contrastingOff = !DOM.contrastingTones.checked;

  // Add/remove class on body based on mode
  if (mode === "text") {
    document.body.classList.add("text-mode");
  } else {
    document.body.classList.remove("text-mode");
  }

  colors.forEach((color, index) => {
    const hex = hslToHex(color.h, color.s, color.l);
    const name = getDescriptiveColorName(color.h, color.s, color.l);

    let textColor;

    if (mode === "palette" || (mode === "text" && contrastingOff)) {
const textL =
  color.l < 10 ? 100 - (color.l / 10) * 20 :
  color.l < 40 ? 80 :
  color.l < 50 ? 80 + ((color.l - 40) / 10) * 10 :
  color.l === 50 ? 0 :
  color.l < 60 ? 10 :
  color.l < 90 ? 10 + ((color.l - 60) / 30) * 10 :
  20 - ((color.l - 90) / 10) * 20;

      textColor = hslToHex(color.h, color.s, textL);
    } else {
      let sourceIndex;
      if (index === 0) {
        sourceIndex = 1;
      } else if (index % 2 === 1) {
        sourceIndex = 0;
      } else {
        sourceIndex = 1;
      }
      textColor = hslToHex(
        colors[sourceIndex].h,
        colors[sourceIndex].s,
        colors[sourceIndex].l
      );
    }

    const swatch = document.createElement("div");
    swatch.className = "color-swatch";
    swatch.style.background = hex;
    swatch.setAttribute("data-hex", hex);
    swatch.innerHTML = `
      <div class="color-name" style="color: ${textColor}">${name}</div>
      <div class="hex-value" style="color: ${textColor}">${hex}</div>
    `;

    fragment.appendChild(swatch);
  });

  DOM.colorGrid.innerHTML = "";
  DOM.colorGrid.appendChild(fragment);
}



const copyTimeouts = new Map();

DOM.colorGrid.addEventListener("click", function (e) {
  const swatch = e.target.closest(".color-swatch");
  if (!swatch) return;

  const hex = swatch.getAttribute("data-hex");
  const hexValue = swatch.querySelector(".hex-value");

  if (hexValue.textContent === "Copied!") return;

  const originalText = hexValue.textContent;

  if (copyTimeouts.has(swatch)) {
    clearTimeout(copyTimeouts.get(swatch));
  }

  navigator.clipboard.writeText(hex).then(() => {
    hexValue.textContent = "Copied!";

    const timeoutId = setTimeout(() => {
      hexValue.textContent = originalText;
      copyTimeouts.delete(swatch);
    }, 1000);

    copyTimeouts.set(swatch, timeoutId);
  });
});

function updateColorButtons() {
  DOM.numColorsDisplay.textContent = numColors;

  if (numColors <= MIN_COLORS) {
    DOM.decreaseColors.classList.add("disabled");
  } else {
    DOM.decreaseColors.classList.remove("disabled");
  }

  if (numColors >= MAX_COLORS) {
    DOM.increaseColors.classList.add("disabled");
  } else {
    DOM.increaseColors.classList.remove("disabled");
  }
}

DOM.decreaseColors.addEventListener("click", () => {
  if (numColors > MIN_COLORS) {
    numColors--;
    updateColorButtons();
    generateColorScheme();
  }
});

DOM.increaseColors.addEventListener("click", () => {
  if (numColors < MAX_COLORS) {
    numColors++;
    updateColorButtons();
    generateColorScheme();
  }
});

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", function () {
    document
      .querySelectorAll(".tab")
      .forEach((t) => t.classList.remove("active"));
    this.classList.add("active");
    currentScheme = this.getAttribute("data-scheme");
    generateColorScheme();
  });
});

DOM.colorPicker.addEventListener("input", (e) => {
  const hsl = hexToHsl(e.target.value);
  updateAllInputs(hsl.h, hsl.s, hsl.l);
});

DOM.colorDropdown.addEventListener("change", (e) => {
  updateAllInputs(parseInt(e.target.value), 60, 60);
});

DOM.hexInput.addEventListener("blur", (e) => {
  let value = e.target.value.trim().replace("#", "");

  if (/^[0-9A-Fa-f]{8}$/.test(value)) value = value.substring(0, 6);
  if (/^[0-9A-Fa-f]{3}$/.test(value))
    value = value
      .split("")
      .map((c) => c + c)
      .join("");

  if (/^[0-9A-Fa-f]{6}$/.test(value)) {
    e.target.value = value;
    const hsl = hexToHsl("#" + value);
    updateAllInputs(hsl.h, hsl.s, hsl.l);
  } else {
    const h = parseInt(DOM.hueSlider.value);
    const s = parseInt(DOM.satSlider.value);
    const l = parseInt(DOM.lightSlider.value);
    e.target.value = hslToHex(h, s, l).replace("#", "");
  }
});

DOM.hexInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") e.target.blur();
});

DOM.hexInput.addEventListener("focus", (e) => {
  setTimeout(() => e.target.select(), 0);
});

DOM.randomBtn.addEventListener("click", () => {
  const h = Math.floor(Math.random() * 361);
  const s = Math.floor(Math.random() * 101);
  const l = Math.floor(Math.random() * 101);
  updateAllInputs(h, s, l);
});

DOM.hueSlider.addEventListener("input", (e) => {
  updateAllInputs(
    parseInt(e.target.value),
    parseInt(DOM.satSlider.value),
    parseInt(DOM.lightSlider.value)
  );
});

DOM.satSlider.addEventListener("input", (e) => {
  updateAllInputs(
    parseInt(DOM.hueSlider.value),
    parseInt(e.target.value),
    parseInt(DOM.lightSlider.value)
  );
});

DOM.lightSlider.addEventListener("input", (e) => {
  updateAllInputs(
    parseInt(DOM.hueSlider.value),
    parseInt(DOM.satSlider.value),
    parseInt(e.target.value)
  );
});

DOM.contrastingTones.addEventListener("change", generateColorScheme);

//DOM.textColorMode.addEventListener("change", generateColorScheme);
DOM.textColorToggle.addEventListener("change", generateColorScheme);

const h = Math.floor(Math.random() * 361);
const s = Math.floor(Math.random() * 101);
const l = Math.floor(Math.random() * 101);
updateAllInputs(h, s, l);
updateColorButtons();
