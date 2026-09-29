// MEB 1. Sınıf Dik Temel Abece - Harf, Rakam ve Çizgi Vektör Hamleleri
// Kılavuz Çizgi Koordinat Sistemi:
// y = 0.0 -> Tepe Çizgisi (Üst mavi çizgi)
// y = 1.0 -> Gövde Çizgisi (Orta kesikli çizgi)
// y = 2.0 -> Taban Çizgisi (Kırmızı zemin çizgisi)
// y = 3.0 -> Kuyruk Çizgisi (Alt mavi çizgi)
// x = 0.0..1.0 -> Karakter yatay genişlik aralığı

function arc(cx, cy, rx, ry, startAngle, endAngle, steps = 18) {
    const pts = [];
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const angle = startAngle + t * (endAngle - startAngle);
        pts.push({
            x: Math.round((cx + rx * Math.cos(angle)) * 1000) / 1000,
            y: Math.round((cy + ry * Math.sin(angle)) * 1000) / 1000
        });
    }
    return pts;
}

function line(x1, y1, x2, y2) {
    return [{ x: x1, y: y1 }, { x: x2, y: y2 }];
}

// Sine wave generator for wavy lines
function sineWave(xStart, xEnd, yCenter, amplitude, cycles = 3, steps = 36) {
    const pts = [];
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const x = xStart + t * (xEnd - xStart);
        const y = yCenter + Math.sin(t * Math.PI * 2 * cycles) * amplitude;
        pts.push({
            x: Math.round(x * 1000) / 1000,
            y: Math.round(y * 1000) / 1000
        });
    }
    return pts;
}

export const STROKE_DATA = {
    // ===== BÜYÜK HARFLER (0.0 Tepe -> 2.0 Taban) =====
    'E': [
        line(0.2, 0.0, 0.2, 2.0),
        line(0.2, 0.0, 0.8, 0.0),
        line(0.2, 1.0, 0.68, 1.0),
        line(0.2, 2.0, 0.8, 2.0)
    ],
    'L': [
        line(0.25, 0.0, 0.25, 2.0),
        line(0.25, 2.0, 0.8, 2.0)
    ],
    'A': [
        line(0.5, 0.0, 0.15, 2.0),
        line(0.5, 0.0, 0.85, 2.0),
        line(0.28, 1.25, 0.72, 1.25)
    ],
    'K': [
        line(0.22, 0.0, 0.22, 2.0),
        line(0.78, 0.0, 0.25, 1.05),
        line(0.35, 0.95, 0.78, 2.0)
    ],
    'İ': [
        line(0.5, 0.0, 0.5, 2.0),
        [{ x: 0.5, y: -0.3 }, { x: 0.5, y: -0.3 }]
    ],
    'N': [
        line(0.2, 0.0, 0.2, 2.0),
        line(0.2, 0.0, 0.8, 2.0),
        line(0.8, 2.0, 0.8, 0.0)
    ],
    'O': [
        arc(0.5, 1.0, 0.35, 1.0, -Math.PI / 2, -Math.PI / 2 + 2 * Math.PI, 28)
    ],
    'M': [
        line(0.18, 0.0, 0.18, 2.0),
        line(0.18, 0.0, 0.5, 1.8),
        line(0.5, 1.8, 0.82, 0.0),
        line(0.82, 0.0, 0.82, 2.0)
    ],
    'U': [
        [
            { x: 0.22, y: 0.0 },
            ...arc(0.5, 1.4, 0.28, 0.6, Math.PI, 0, 16),
            { x: 0.78, y: 0.0 }
        ]
    ],
    'T': [
        line(0.15, 0.0, 0.85, 0.0),
        line(0.5, 0.0, 0.5, 2.0)
    ],
    'Ü': [
        [
            { x: 0.22, y: 0.0 },
            ...arc(0.5, 1.4, 0.28, 0.6, Math.PI, 0, 16),
            { x: 0.78, y: 0.0 }
        ],
        [{ x: 0.35, y: -0.3 }, { x: 0.35, y: -0.3 }],
        [{ x: 0.65, y: -0.3 }, { x: 0.65, y: -0.3 }]
    ],
    'Y': [
        line(0.2, 0.0, 0.5, 1.0),
        line(0.8, 0.0, 0.5, 1.0),
        line(0.5, 1.0, 0.5, 2.0)
    ],
    'Ö': [
        arc(0.5, 1.0, 0.35, 1.0, -Math.PI / 2, -Math.PI / 2 + 2 * Math.PI, 28),
        [{ x: 0.35, y: -0.3 }, { x: 0.35, y: -0.3 }],
        [{ x: 0.65, y: -0.3 }, { x: 0.65, y: -0.3 }]
    ],
    'R': [
        line(0.2, 0.0, 0.2, 2.0),
        arc(0.2, 0.5, 0.45, 0.5, -Math.PI / 2, Math.PI / 2, 16),
        line(0.35, 1.0, 0.8, 2.0)
    ],
    'I': [
        line(0.5, 0.0, 0.5, 2.0)
    ],
    'D': [
        line(0.2, 0.0, 0.2, 2.0),
        arc(0.2, 1.0, 0.58, 1.0, -Math.PI / 2, Math.PI / 2, 20)
    ],
    'S': [
        [
            ...arc(0.5, 0.5, 0.28, 0.5, 0, -Math.PI, 14),
            ...arc(0.5, 1.5, 0.3, 0.5, 0, Math.PI, 14)
        ]
    ],
    'B': [
        line(0.2, 0.0, 0.2, 2.0),
        arc(0.2, 0.5, 0.45, 0.5, -Math.PI / 2, Math.PI / 2, 14),
        arc(0.2, 1.5, 0.5, 0.5, -Math.PI / 2, Math.PI / 2, 14)
    ],
    'Z': [
        line(0.2, 0.0, 0.8, 0.0),
        line(0.8, 0.0, 0.2, 2.0),
        line(0.2, 2.0, 0.8, 2.0)
    ],
    'Ç': [
        arc(0.55, 1.0, 0.38, 1.0, -Math.PI / 4, -7 * Math.PI / 4, 20),
        line(0.5, 2.05, 0.5, 2.4)
    ],
    'G': [
        arc(0.55, 1.0, 0.38, 1.0, -Math.PI / 4, -7 * Math.PI / 4, 20),
        line(0.8, 1.0, 0.5, 1.0)
    ],
    'Ş': [
        [
            ...arc(0.5, 0.5, 0.28, 0.5, 0, -Math.PI, 14),
            ...arc(0.5, 1.5, 0.3, 0.5, 0, Math.PI, 14)
        ],
        line(0.5, 2.05, 0.5, 2.4)
    ],
    'C': [
        arc(0.55, 1.0, 0.38, 1.0, -Math.PI / 4, -7 * Math.PI / 4, 20)
    ],
    'P': [
        line(0.2, 0.0, 0.2, 2.0),
        arc(0.2, 0.5, 0.48, 0.5, -Math.PI / 2, Math.PI / 2, 16)
    ],
    'H': [
        line(0.2, 0.0, 0.2, 2.0),
        line(0.8, 0.0, 0.8, 2.0),
        line(0.2, 1.0, 0.8, 1.0)
    ],
    'V': [
        line(0.2, 0.0, 0.5, 2.0),
        line(0.5, 2.0, 0.8, 0.0)
    ],
    'Ğ': [
        arc(0.55, 1.0, 0.38, 1.0, -Math.PI / 4, -7 * Math.PI / 4, 20),
        line(0.8, 1.0, 0.5, 1.0),
        arc(0.5, -0.2, 0.25, 0.15, Math.PI, 0, 10)
    ],
    'F': [
        line(0.2, 0.0, 0.2, 2.0),
        line(0.2, 0.0, 0.8, 0.0),
        line(0.2, 1.0, 0.65, 1.0)
    ],
    'J': [
        [
            { x: 0.68, y: 0.0 },
            ...arc(0.45, 1.55, 0.23, 0.45, 0, Math.PI, 12)
        ]
    ],

    // ===== KÜÇÜK HARFLER =====
    'e': [
        [
            { x: 0.22, y: 1.5 },
            { x: 0.78, y: 1.5 },
            ...arc(0.5, 1.5, 0.28, 0.5, 0, -Math.PI * 1.5, 20)
        ]
    ],
    'l': [
        [
            { x: 0.5, y: 0.0 },
            { x: 0.5, y: 1.85 },
            { x: 0.65, y: 2.0 }
        ]
    ],
    'a': [
        arc(0.5, 1.5, 0.26, 0.5, 0, -2 * Math.PI, 20),
        line(0.76, 1.0, 0.76, 2.0)
    ],
    'k': [
        line(0.25, 0.0, 0.25, 2.0),
        line(0.75, 1.05, 0.28, 1.55),
        line(0.35, 1.45, 0.75, 2.0)
    ],
    'i': [
        line(0.5, 1.0, 0.5, 2.0),
        [{ x: 0.5, y: 0.65 }, { x: 0.5, y: 0.65 }]
    ],
    'n': [
        line(0.25, 1.0, 0.25, 2.0),
        [
            ...arc(0.5, 1.35, 0.25, 0.35, Math.PI, 0, 12),
            { x: 0.75, y: 2.0 }
        ]
    ],
    'o': [
        arc(0.5, 1.5, 0.28, 0.5, -Math.PI / 2, -Math.PI / 2 + 2 * Math.PI, 22)
    ],
    'm': [
        line(0.18, 1.0, 0.18, 2.0),
        [
            ...arc(0.36, 1.35, 0.18, 0.35, Math.PI, 0, 10),
            { x: 0.54, y: 2.0 }
        ],
        [
            ...arc(0.72, 1.35, 0.18, 0.35, Math.PI, 0, 10),
            { x: 0.9, y: 2.0 }
        ]
    ],
    'u': [
        [
            { x: 0.25, y: 1.0 },
            ...arc(0.5, 1.65, 0.25, 0.35, Math.PI, 0, 12),
            { x: 0.75, y: 1.0 }
        ],
        line(0.75, 1.0, 0.75, 2.0)
    ],
    't': [
        [
            { x: 0.5, y: 0.3 },
            { x: 0.5, y: 1.85 },
            { x: 0.65, y: 2.0 }
        ],
        line(0.3, 1.0, 0.7, 1.0)
    ],
    'ü': [
        [
            { x: 0.25, y: 1.0 },
            ...arc(0.5, 1.65, 0.25, 0.35, Math.PI, 0, 12),
            { x: 0.75, y: 1.0 }
        ],
        line(0.75, 1.0, 0.75, 2.0),
        [{ x: 0.35, y: 0.65 }, { x: 0.35, y: 0.65 }],
        [{ x: 0.65, y: 0.65 }, { x: 0.65, y: 0.65 }]
    ],
    'y': [
        line(0.25, 1.0, 0.5, 2.0),
        line(0.75, 1.0, 0.25, 3.0)
    ],
    'ö': [
        arc(0.5, 1.5, 0.28, 0.5, -Math.PI / 2, -Math.PI / 2 + 2 * Math.PI, 22),
        [{ x: 0.35, y: 0.65 }, { x: 0.35, y: 0.65 }],
        [{ x: 0.65, y: 0.65 }, { x: 0.65, y: 0.65 }]
    ],
    'r': [
        line(0.25, 1.0, 0.25, 2.0),
        arc(0.48, 1.3, 0.23, 0.3, Math.PI, 0, 10)
    ],
    'ı': [
        line(0.5, 1.0, 0.5, 2.0)
    ],
    'd': [
        arc(0.5, 1.5, 0.26, 0.5, 0, -2 * Math.PI, 20),
        line(0.76, 0.0, 0.76, 2.0)
    ],
    's': [
        [
            ...arc(0.5, 1.25, 0.22, 0.25, 0, -Math.PI, 12),
            ...arc(0.5, 1.75, 0.24, 0.25, 0, Math.PI, 12)
        ]
    ],
    'b': [
        line(0.24, 0.0, 0.24, 2.0),
        arc(0.5, 1.5, 0.26, 0.5, -Math.PI, Math.PI, 20)
    ],
    'z': [
        line(0.25, 1.0, 0.75, 1.0),
        line(0.75, 1.0, 0.25, 2.0),
        line(0.25, 2.0, 0.75, 2.0)
    ],
    'ç': [
        arc(0.55, 1.5, 0.28, 0.5, -Math.PI / 4, -7 * Math.PI / 4, 16),
        line(0.5, 2.05, 0.5, 2.35)
    ],
    'g': [
        arc(0.5, 1.5, 0.26, 0.5, 0, -2 * Math.PI, 20),
        [
            { x: 0.76, y: 1.0 },
            { x: 0.76, y: 2.7 },
            ...arc(0.55, 2.7, 0.21, 0.3, 0, Math.PI, 10)
        ]
    ],
    'ş': [
        [
            ...arc(0.5, 1.25, 0.22, 0.25, 0, -Math.PI, 12),
            ...arc(0.5, 1.75, 0.24, 0.25, 0, Math.PI, 12)
        ],
        line(0.5, 2.05, 0.5, 2.35)
    ],
    'c': [
        arc(0.55, 1.5, 0.28, 0.5, -Math.PI / 4, -7 * Math.PI / 4, 16)
    ],
    'p': [
        line(0.24, 1.0, 0.24, 3.0),
        arc(0.5, 1.5, 0.26, 0.5, -Math.PI, Math.PI, 20)
    ],
    'h': [
        line(0.24, 0.0, 0.24, 2.0),
        [
            ...arc(0.5, 1.35, 0.26, 0.35, Math.PI, 0, 12),
            { x: 0.76, y: 2.0 }
        ]
    ],
    'v': [
        line(0.25, 1.0, 0.5, 2.0),
        line(0.5, 2.0, 0.75, 1.0)
    ],
    'ğ': [
        arc(0.5, 1.5, 0.26, 0.5, 0, -2 * Math.PI, 20),
        [
            { x: 0.76, y: 1.0 },
            { x: 0.76, y: 2.7 },
            ...arc(0.55, 2.7, 0.21, 0.3, 0, Math.PI, 10)
        ],
        arc(0.5, 0.75, 0.2, 0.12, Math.PI, 0, 8)
    ],
    'f': [
        [
            ...arc(0.65, 0.3, 0.2, 0.3, 0, -Math.PI, 10),
            { x: 0.45, y: 2.0 }
        ],
        line(0.3, 1.0, 0.65, 1.0)
    ],
    'j': [
        [
            { x: 0.65, y: 1.0 },
            { x: 0.65, y: 2.7 },
            ...arc(0.45, 2.7, 0.2, 0.3, 0, Math.PI, 10)
        ],
        [{ x: 0.65, y: 0.65 }, { x: 0.65, y: 0.65 }]
    ],

    // ===== RAKAMLAR (0-9) =====
    '0': [
        arc(0.5, 1.0, 0.32, 1.0, -Math.PI / 2, -Math.PI / 2 + 2 * Math.PI, 28)
    ],
    '1': [
        line(0.32, 0.5, 0.55, 0.0),
        line(0.55, 0.0, 0.55, 2.0)
    ],
    '2': [
        [
            ...arc(0.5, 0.45, 0.3, 0.45, Math.PI, 0, 14),
            { x: 0.22, y: 2.0 },
            { x: 0.78, y: 2.0 }
        ]
    ],
    '3': [
        [
            ...arc(0.5, 0.5, 0.28, 0.5, -Math.PI / 1.5, Math.PI / 2, 14),
            ...arc(0.5, 1.5, 0.32, 0.5, -Math.PI / 2, 3 * Math.PI / 4, 14)
        ]
    ],
    '4': [
        line(0.65, 0.0, 0.2, 1.35),
        line(0.2, 1.35, 0.82, 1.35),
        line(0.65, 0.7, 0.65, 2.0)
    ],
    '5': [
        [
            { x: 0.35, y: 0.0 },
            { x: 0.35, y: 0.85 },
            ...arc(0.5, 1.42, 0.32, 0.58, -Math.PI / 1.2, 3 * Math.PI / 4, 16)
        ],
        line(0.35, 0.0, 0.75, 0.0)
    ],
    '6': [
        [
            ...arc(0.55, 0.7, 0.32, 0.7, -Math.PI / 3, -Math.PI, 12),
            ...arc(0.5, 1.45, 0.3, 0.55, Math.PI, 3 * Math.PI, 20)
        ]
    ],
    '7': [
        line(0.2, 0.0, 0.8, 0.0),
        line(0.8, 0.0, 0.35, 2.0),
        line(0.42, 1.0, 0.68, 1.0)
    ],
    '8': [
        [
            ...arc(0.5, 0.5, 0.26, 0.5, Math.PI / 2, -3 * Math.PI / 2, 18),
            ...arc(0.5, 1.5, 0.32, 0.5, -Math.PI / 2, 3 * Math.PI / 2, 18)
        ]
    ],
    '9': [
        [
            ...arc(0.5, 0.55, 0.3, 0.55, -Math.PI / 2, -2.5 * Math.PI, 20),
            { x: 0.78, y: 1.7 },
            { x: 0.5, y: 2.0 }
        ]
    ],

    // ===== ÇİZGİ ÇALIŞMALARI =====
    'dik': [
        line(0.5, 0.0, 0.5, 2.0)
    ],
    'yatay': [
        line(0.1, 1.0, 0.9, 1.0)
    ],
    'egik-sag': [
        line(0.2, 0.0, 0.8, 2.0)
    ],
    'egik-sol': [
        line(0.8, 0.0, 0.2, 2.0)
    ],
    'dalga': [
        sineWave(0.1, 0.9, 1.0, 0.35, 3, 36)
    ],
    'cember': [
        arc(0.5, 1.0, 0.42, 0.95, -Math.PI / 2, -Math.PI / 2 + 2 * Math.PI, 32)
    ]
};

// Karakter için hamle listesini getir (yoksa varsayılan dikey çizgi döner)
export function getStrokesForChar(charKey) {
    if (!charKey) return STROKE_DATA['dik'];
    if (STROKE_DATA[charKey]) return STROKE_DATA[charKey];
    // Fallback: Büyük/Küçük harf denemesi
    if (charKey.length === 1) {
        const upper = charKey.toUpperCase();
        if (STROKE_DATA[upper]) return STROKE_DATA[upper];
        const lower = charKey.toLowerCase();
        if (STROKE_DATA[lower]) return STROKE_DATA[lower];
    }
    return STROKE_DATA['dik'];
}

// Hamle noktalarını ekran piksellerine dönüştür
export function transformStrokePoint(pt, metrics) {
    const { xLeft, letterWidth, yTepe, spacing } = metrics;
    return {
        x: xLeft + pt.x * letterWidth,
        y: yTepe + pt.y * spacing
    };
}
