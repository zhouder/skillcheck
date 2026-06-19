const basePenalty = {
    error: 18,
    warning: 5,
    info: 1
};
const categoryMultiplier = {
    spec: 1.15,
    security: 1.35,
    quality: 1,
    efficiency: 0.8,
    portability: 0.8,
    internal: 1.5
};
const scoreDecay = 90;
export function scoreFindings(findings) {
    const groups = new Map();
    for (const finding of findings) {
        const key = `${finding.ruleId}\u0000${finding.severity}\u0000${finding.category}`;
        const group = groups.get(key);
        if (group) {
            group.count += 1;
        }
        else {
            groups.set(key, { finding, count: 1 });
        }
    }
    let penalty = 0;
    for (const { finding, count } of groups.values()) {
        const unit = basePenalty[finding.severity] * categoryMultiplier[finding.category];
        penalty += unit * harmonicNumber(count);
    }
    return Math.max(0, Math.min(100, Math.round(100 * Math.exp(-penalty / scoreDecay))));
}
function harmonicNumber(count) {
    let value = 0;
    for (let occurrence = 1; occurrence <= count; occurrence += 1) {
        value += 1 / occurrence;
    }
    return value;
}
export function scoreGrade(score) {
    if (score >= 90)
        return "A";
    if (score >= 80)
        return "B";
    if (score >= 70)
        return "C";
    if (score >= 60)
        return "D";
    return "F";
}
//# sourceMappingURL=scoring.js.map