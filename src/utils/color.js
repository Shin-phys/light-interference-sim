export const getWavelengthRGB = (lambda) => {
    let R, G, B;
    if (lambda >= 380 && lambda < 440) {
        R = -(lambda - 440) / (440 - 380);
        G = 0.0;
        B = 1.0;
    } else if (lambda >= 440 && lambda < 490) {
        R = 0.0;
        G = (lambda - 440) / (490 - 440);
        B = 1.0;
    } else if (lambda >= 490 && lambda < 510) {
        R = 0.0;
        G = 1.0;
        B = -(lambda - 510) / (510 - 490);
    } else if (lambda >= 510 && lambda < 580) {
        R = (lambda - 510) / (580 - 510);
        G = 1.0;
        B = 0.0;
    } else if (lambda >= 580 && lambda < 645) {
        R = 1.0;
        G = -(lambda - 645) / (645 - 580);
        B = 0.0;
    } else if (lambda >= 645 && lambda <= 780) {
        R = 1.0;
        G = 0.0;
        B = 0.0;
    } else {
        R = 0.0; G = 0.0; B = 0.0;
    }
    let intensity = 1.0;
    if (lambda >= 380 && lambda < 420) intensity = 0.3 + 0.7 * (lambda - 380) / (420 - 380);
    else if (lambda > 700 && lambda <= 780) intensity = 0.3 + 0.7 * (780 - lambda) / (780 - 700);

    return {
        r: Math.round(R * intensity * 255),
        g: Math.round(G * intensity * 255),
        b: Math.round(B * intensity * 255)
    };
};

export const getWavelengthColorStr = (lambda) => {
    const c = getWavelengthRGB(lambda);
    return `rgb(${c.r}, ${c.g}, ${c.b})`;
};

// 白色光をシミュレートするための可視光サンプリング（簡易版）
export const visibleWavelengths = [
    400, 420, 440, 460, 480, 500, 520, 540, 560, 580, 600, 620, 640, 660, 680, 700
];
