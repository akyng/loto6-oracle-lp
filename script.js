document.addEventListener('DOMContentLoaded', () => {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const inputsContainer = document.getElementById('inputs-container');
    const btnDiagnose = document.getElementById('btn-diagnose');
    const btnQuickSelect = document.getElementById('btn-quick-select');
    const resultArea = document.getElementById('result-area');
    
    // Result DOM Elements
    const scoreValue = document.getElementById('score-value');
    const scoreGrade = document.getElementById('score-grade');
    const scoreSummary = document.getElementById('score-summary');
    const detailSum = document.getElementById('detail-sum');
    const detailEvenOdd = document.getElementById('detail-evenodd');
    const detailHighLow = document.getElementById('detail-highlow');
    const detailConsecutive = document.getElementById('detail-consecutive');
    
    const circle = document.querySelector('.progress-ring__circle');
    
    // Configurations for each lottery type
    const configs = {
        loto6: {
            count: 6,
            max: 43,
            threshold: 22, // 1-22 (Low), 23-43 (High)
            avgSum: 132,
            sumRanges: [
                { diff: 10, score: 100 },
                { diff: 20, score: 90 },
                { diff: 30, score: 80 },
                { diff: 40, score: 70 },
                { diff: 50, score: 60 }
            ],
            idealConsecutive: [1, 2],
            name: 'ロト6'
        },
        loto7: {
            count: 7,
            max: 37,
            threshold: 18, // 1-18 (Low), 19-37 (High)
            avgSum: 133,
            sumRanges: [
                { diff: 10, score: 100 },
                { diff: 20, score: 90 },
                { diff: 30, score: 80 },
                { diff: 40, score: 70 },
                { diff: 50, score: 60 }
            ],
            idealConsecutive: [1, 2],
            name: 'ロト7'
        },
        miniloto: {
            count: 5,
            max: 31,
            threshold: 15, // 1-15 (Low), 16-31 (High)
            avgSum: 80,
            sumRanges: [
                { diff: 6, score: 100 },
                { diff: 12, score: 90 },
                { diff: 18, score: 80 },
                { diff: 24, score: 70 },
                { diff: 30, score: 60 }
            ],
            idealConsecutive: [0, 1],
            name: 'ミニロト'
        }
    };
    
    let currentType = 'loto6';

    function setProgress(percent) {
        const radius = circle.r.baseVal.value;
        const circumference = radius * 2 * Math.PI;
        circle.style.strokeDasharray = `${circumference} ${circumference}`;
        const offset = circumference - (percent / 100) * circumference;
        circle.style.strokeDashoffset = offset;
    }

    // Initialize progress ring
    setProgress(0);

    // Render input elements dynamically
    function renderInputs(type) {
        const config = configs[type];
        inputsContainer.innerHTML = '';
        inputsContainer.className = `number-inputs cols-${config.count}`;
        
        // Update threshold label
        const highlowThresholdLabel = document.getElementById('highlow-threshold-label');
        if (highlowThresholdLabel) {
            highlowThresholdLabel.textContent = `(${config.threshold + 1}基準)`;
        }
        
        for (let i = 0; i < config.count; i++) {
            const input = document.createElement('input');
            input.type = 'number';
            input.className = 'num-input';
            input.min = 1;
            input.max = config.max;
            input.placeholder = (i + 1).toString();
            input.required = true;
            
            // Limit characters and select on focus for better mobile experience
            input.addEventListener('focus', () => input.select());
            input.addEventListener('input', (e) => {
                let val = parseInt(e.target.value, 10);
                if (val > config.max) {
                    e.target.value = config.max;
                }
            });
            inputsContainer.appendChild(input);
        }
    }

    // Switch Tab functionality
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const type = button.getAttribute('data-type');
            if (type === currentType) return;
            
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            currentType = type;
            renderInputs(type);
            
            // Toggle placeholder and content visibility to prevent jumping
            const resultPlaceholder = document.getElementById('result-placeholder');
            const resultContent = document.getElementById('result-content');
            if (resultPlaceholder && resultContent) {
                resultPlaceholder.style.display = 'flex';
                resultContent.style.display = 'none';
            }
            setProgress(0);
        });
    });

    // Initial render
    renderInputs(currentType);

    // Quick Select (Random generation)
    btnQuickSelect.addEventListener('click', () => {
        const config = configs[currentType];
        const selectedNums = [];
        while (selectedNums.length < config.count) {
            const rand = Math.floor(Math.random() * config.max) + 1;
            if (!selectedNums.includes(rand)) {
                selectedNums.push(rand);
            }
        }
        
        // Sort ascending
        selectedNums.sort((a, b) => a - b);
        
        // Populate inputs
        const inputs = inputsContainer.querySelectorAll('.num-input');
        inputs.forEach((input, index) => {
            input.value = selectedNums[index];
        });
        
        // Auto trigger diagnostic
        diagnoseNumbers();
    });

    btnDiagnose.addEventListener('click', () => {
        diagnoseNumbers();
    });

    function diagnoseNumbers() {
        const config = configs[currentType];
        const inputs = inputsContainer.querySelectorAll('.num-input');
        const nums = [];
        let hasEmpty = false;
        let hasInvalid = false;
        
        inputs.forEach(input => {
            const val = parseInt(input.value, 10);
            if (isNaN(val)) {
                hasEmpty = true;
            } else if (val < 1 || val > config.max) {
                hasInvalid = true;
            } else {
                nums.push(val);
            }
        });
        
        if (hasEmpty) {
            alert(`すべての入力欄に1から${config.max}の数字を入力してください。`);
            return;
        }
        
        if (hasInvalid) {
            alert(`1から${config.max}の範囲内の数字を入力してください。`);
            return;
        }
        
        // Check for duplicates
        const uniqueNums = new Set(nums);
        if (uniqueNums.size !== config.count) {
            alert('同じ数字を複数入力することはできません。重複を避けてください。');
            return;
        }

        // Sort numbers for calculations
        nums.sort((a, b) => a - b);

        // Perform analysis
        calculateScores(nums);
    }

    function calculateScores(numbers) {
        const config = configs[currentType];
        const totalCount = config.count;

        // 1. Sum Calculation
        const sum = numbers.reduce((a, b) => a + b, 0);
        const sumDiff = Math.abs(sum - config.avgSum);
        let sumScore = 50;
        let sumText = '';
        
        for (const range of config.sumRanges) {
            if (sumDiff <= range.diff) {
                sumScore = range.score;
                break;
            }
        }
        
        // Set balance status text
        const sumMargin = currentType === 'miniloto' ? 8 : 15;
        if (sumDiff <= sumMargin) {
            sumText = `良バランス (合計値:${sum})`;
        } else if (sum < config.avgSum - sumMargin) {
            sumText = `低め偏り (合計値:${sum})`;
        } else {
            sumText = `高め偏り (合計値:${sum})`;
        }

        // 2. Even / Odd Ratio
        const evenCount = numbers.filter(n => n % 2 === 0).length;
        const oddCount = totalCount - evenCount;
        let evenOddScore = 50;
        let evenOddText = `${evenCount}偶:${oddCount}奇`;
        
        if (totalCount === 6) {
            const diff = Math.abs(evenCount - 3);
            if (diff === 0) evenOddScore = 100;
            else if (diff === 1) evenOddScore = 85;
            else if (diff === 2) evenOddScore = 70;
            
            if (diff <= 1) evenOddText += ' (黄金比)';
            else evenOddText += ' (偏り)';
        } else if (totalCount === 7) {
            const diff = Math.abs(evenCount - 3.5);
            if (diff === 0.5) evenOddScore = 100;
            else if (diff === 1.5) evenOddScore = 85;
            else if (diff === 2.5) evenOddScore = 70;
            
            if (diff <= 0.5) evenOddText += ' (黄金比)';
            else evenOddText += ' (偏り)';
        } else if (totalCount === 5) {
            const diff = Math.abs(evenCount - 2.5);
            if (diff === 0.5) evenOddScore = 100;
            else if (diff === 1.5) evenOddScore = 85;
            else if (diff === 2.5) evenOddScore = 70;
            
            if (diff <= 0.5) evenOddText += ' (黄金比)';
            else evenOddText += ' (偏り)';
        }

        // 3. High / Low Ratio
        const lowCount = numbers.filter(n => n <= config.threshold).length;
        const highCount = totalCount - lowCount;
        let highLowScore = 50;
        let highLowText = `${lowCount}小:${highCount}大`;
        
        if (totalCount === 6) {
            const diff = Math.abs(lowCount - 3);
            if (diff === 0) highLowScore = 100;
            else if (diff === 1) highLowScore = 85;
            else if (diff === 2) highLowScore = 70;
            
            if (diff <= 1) highLowText += ' (黄金比)';
            else highLowText += ' (偏り)';
        } else if (totalCount === 7) {
            const diff = Math.abs(lowCount - 3.5);
            if (diff === 0.5) highLowScore = 100;
            else if (diff === 1.5) highLowScore = 85;
            else if (diff === 2.5) highLowScore = 70;
            
            if (diff <= 0.5) highLowText += ' (黄金比)';
            else highLowText += ' (偏り)';
        } else if (totalCount === 5) {
            const diff = Math.abs(lowCount - 2.5);
            if (diff === 0.5) highLowScore = 100;
            else if (diff === 1.5) highLowScore = 85;
            else if (diff === 2.5) highLowScore = 70;
            
            if (diff <= 0.5) highLowText += ' (黄金比)';
            else highLowText += ' (偏り)';
        }

        // 4. Consecutive Numbers
        let consecutiveCount = 0;
        for (let i = 0; i < numbers.length - 1; i++) {
            if (numbers[i+1] - numbers[i] === 1) {
                consecutiveCount++;
            }
        }
        
        let consecutiveScore = 60;
        let consecutiveText = '';
        
        if (config.idealConsecutive.includes(consecutiveCount)) {
            consecutiveScore = 100;
            consecutiveText = consecutiveCount === 0 ? '連番なし' : `適度 (${consecutiveCount}組)`;
        } else {
            consecutiveScore = Math.max(80 - (consecutiveCount - 2) * 20, 50);
            consecutiveText = consecutiveCount === 0 ? '連番なし' : `過多 (${consecutiveCount}組)`;
        }

        // 5. Total Score (Weighted average)
        const totalScore = Math.round(
            sumScore * 0.30 +
            evenOddScore * 0.25 +
            highLowScore * 0.25 +
            consecutiveScore * 0.20
        );

        // Grade mapping
        let grade = 'Cランク';
        let summaryText = '偏りがあり、調整が必要です。';
        let gradeColor = '#f87171'; // Red
        
        if (totalScore >= 92) {
            grade = 'Sランク';
            summaryText = '最高水準の理想的な組み合わせです！';
            gradeColor = '#fbbf24'; // Gold
        } else if (totalScore >= 84) {
            grade = 'Aランク';
            summaryText = '非常にバランスがよく、強力な比率です。';
            gradeColor = '#fbbf24'; // Gold
        } else if (totalScore >= 72) {
            grade = 'Bランク';
            summaryText = '一般的なバランスに収まっています。';
            gradeColor = '#60a5fa'; // Blue
        }

        // Show Results and apply animations
        const resultPlaceholder = document.getElementById('result-placeholder');
        const resultContent = document.getElementById('result-content');
        if (resultPlaceholder && resultContent) {
            resultPlaceholder.style.display = 'none';
            resultContent.style.display = 'block';
        }
        scoreGrade.textContent = grade;
        scoreGrade.style.color = gradeColor;
        scoreSummary.textContent = summaryText;
        
        detailSum.textContent = sumText;
        detailEvenOdd.textContent = evenOddText;
        detailHighLow.textContent = highLowText;
        detailConsecutive.textContent = consecutiveText;
        
        // Animate counter and circle
        animateScore(totalScore);
    }

    function animateScore(targetScore) {
        let currentScore = 0;
        const duration = 800; // ms
        const steps = 30;
        const stepTime = duration / steps;
        const increment = targetScore / steps;
        
        const timer = setInterval(() => {
            currentScore += increment;
            if (currentScore >= targetScore) {
                currentScore = targetScore;
                clearInterval(timer);
            }
            const roundedVal = Math.round(currentScore);
            scoreValue.textContent = roundedVal;
            setProgress(roundedVal);
        }, stepTime);
    }
});
