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

// ==========================================================================
// Lucky Day Calendar Integration
// ==========================================================================
(function() {
    document.addEventListener('DOMContentLoaded', () => {
        let luckyDaysData = {};
        let currentDate = new Date();
        let selectedDate = new Date();
        
        const eventExplanations = {
            '天赦日': '天がすべての罪を許す最上の大吉日。年に数回しかなく、新しい事を始めるのに最適。',
            '一粒万倍日': '一粒の籾が万倍にも実る日。財布の新調や宝くじ購入など、お金を使う事に最適。',
            '寅の日': '「虎は千里往って千里還る」ことから、使ったお金がすぐに戻ると言われる金運招来日。',
            '巳の日': '財福の神「弁財天」の縁日。金運や芸術に関する願い事が叶いやすい大吉日。',
            '己巳の日': '巳の日の中でも特に金運が強力な日（60日に一度巡ってくる）。弁財天の縁日。',
            '大安': '六曜における大吉日。「大いに安し」の意味で、何をやっても成功する万事吉の日。',
            '不成就日': '何事も成就しないとされる凶日。吉日の効果が相殺されるため、購入は避けるのが無難。',
            '友引': '「友を引き寄せる」とされる日。朝晩は吉、昼は凶。お祝い事に良い。',
            '先勝': '「先んずれば即ち勝ち」とされる日。午前中は吉、午後は凶。',
            '先負': '「先んずれば即ち負け」とされる日。午前中は凶、午後は吉。',
            '赤口': '正午のみ吉、その他は凶とされる日。怪我や火の元に注意が必要。',
            '仏滅': '六曜における大凶日。「物が滅する日」の意味で、勝負事や新しい行動は避けるのが無難。'
        };

        const weekDaysJa = ['日', '月', '火', '水', '木', '金', '土'];

        // DOM Elements
        const webDetailDate = document.getElementById('web-detail-date');
        const webDetailRokuyou = document.getElementById('web-detail-rokuyou');
        const webSpecialBanners = document.getElementById('web-special-banners');
        const webLuckyEventsList = document.getElementById('web-lucky-events-list');
        const webLuckyAdviceBox = document.getElementById('web-lucky-advice-box');
        
        const btnPrevMonth = document.getElementById('btn-prev-month');
        const btnNextMonth = document.getElementById('btn-next-month');
        const webMonthLabel = document.getElementById('web-month-label');
        const webCalendarDaysGrid = document.getElementById('web-calendar-days-grid');

        if (!webCalendarDaysGrid) return; // Exit if elements are not present (failsafe)

        // Load JSON data
        fetch('./lucky_days.json')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to load lucky_days.json');
                }
                return response.json();
            })
            .then(data => {
                luckyDaysData = data;
                initCalendar();
            })
            .catch(error => {
                console.error('Error loading lucky days data:', error);
                // Fallback initialization with empty data
                initCalendar();
            });

        function initCalendar() {
            // Set up click listeners for navigation
            btnPrevMonth.addEventListener('click', () => {
                currentDate.setMonth(currentDate.getMonth() - 1);
                renderCalendar();
            });

            btnNextMonth.addEventListener('click', () => {
                currentDate.setMonth(currentDate.getMonth() + 1);
                renderCalendar();
            });

            // Initial render
            renderCalendar();
            selectDate(selectedDate);
        }

        function renderCalendar() {
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth();

            // Update month label
            webMonthLabel.textContent = `${year}年${month + 1}月`;

            // Clear grid
            webCalendarDaysGrid.innerHTML = '';

            // First day of the month and number of days
            const firstDayIndex = new Date(year, month, 1).getDay();
            const lastDay = new Date(year, month + 1, 0).getDate();

            // Render empty cells for preceding days
            for (let i = 0; i < firstDayIndex; i++) {
                const emptyCell = document.createElement('div');
                emptyCell.className = 'calendar-day-cell empty';
                webCalendarDaysGrid.appendChild(emptyCell);
            }

            // Render days
            for (let day = 1; day <= lastDay; day++) {
                const dayCell = document.createElement('div');
                dayCell.className = 'calendar-day-cell';
                
                const cellDate = new Date(year, month, day);
                const dateStr = formatDateKey(cellDate);
                const dayOfWeek = cellDate.getDay();

                // Set classes for Saturday and Sunday
                if (dayOfWeek === 0) dayCell.classList.add('sunday');
                if (dayOfWeek === 6) dayCell.classList.add('saturday');

                // Set today class
                const today = new Date();
                if (cellDate.toDateString() === today.toDateString()) {
                    dayCell.classList.add('today');
                }

                // Set selected class
                if (cellDate.toDateString() === selectedDate.toDateString()) {
                    dayCell.classList.add('selected');
                }

                // Day number element
                const numberEl = document.createElement('span');
                numberEl.className = 'day-number';
                numberEl.textContent = day;
                dayCell.appendChild(numberEl);

                // Get day info
                const info = luckyDaysData[dateStr];
                let hasLucky = false;
                let hasFujojubi = false;

                if (info) {
                    // Rokuyou text
                    if (info.rokuyou) {
                        const rokuyouEl = document.createElement('span');
                        rokuyouEl.className = 'day-rokuyou';
                        rokuyouEl.textContent = info.rokuyou;
                        dayCell.appendChild(rokuyouEl);
                    }

                    hasLucky = info.is_lucky === true || info.is_lucky === 1;
                    hasFujojubi = info.is_fujojubi === true || info.is_fujojubi === 1;
                }

                // Indicators container
                const indicatorsContainer = document.createElement('div');
                indicatorsContainer.className = 'day-indicators';

                if (hasLucky) {
                    const dot = document.createElement('span');
                    dot.className = 'dot-indicator lucky';
                    indicatorsContainer.appendChild(dot);
                }
                if (hasFujojubi) {
                    const dot = document.createElement('span');
                    dot.className = 'dot-indicator fujojubi';
                    indicatorsContainer.appendChild(dot);
                }
                dayCell.appendChild(indicatorsContainer);

                // Add click listener
                dayCell.addEventListener('click', () => {
                    // Remove previous selected class
                    const selectedCells = webCalendarDaysGrid.querySelectorAll('.calendar-day-cell.selected');
                    selectedCells.forEach(cell => cell.classList.remove('selected'));
                    
                    dayCell.classList.add('selected');
                    selectedDate = cellDate;
                    selectDate(selectedDate);
                });

                webCalendarDaysGrid.appendChild(dayCell);
            }
        }

        function selectDate(date) {
            const year = date.getFullYear();
            const month = date.getMonth();
            const day = date.getDate();
            const dayOfWeek = date.getDay();
            const dateStr = formatDateKey(date);

            // Update header label
            webDetailDate.textContent = `${year}年${month + 1}月${day}日 (${weekDaysJa[dayOfWeek]})`;

            // Reset details
            webDetailRokuyou.textContent = '-';
            webDetailRokuyou.className = 'detail-rokuyou-badge';
            webSpecialBanners.innerHTML = '';
            webLuckyEventsList.innerHTML = '';
            webLuckyAdviceBox.innerHTML = '';

            const info = luckyDaysData[dateStr];
            if (!info) {
                // If date is out of range, show placeholder info
                webDetailRokuyou.textContent = 'なし';
                webLuckyAdviceBox.innerHTML = '<p>この日の詳細データはありません。2026年〜2030年の範囲でご覧ください。</p>';
                return;
            }

            // 1. Rokuyou Badge
            const rokuyou = info.rokuyou || '';
            webDetailRokuyou.textContent = rokuyou;
            if (rokuyou === '大安') {
                webDetailRokuyou.classList.add('daian');
            } else if (rokuyou === '仏滅') {
                webDetailRokuyou.classList.add('butsumetsu');
            }

            // 2. Event Banners
            const events = info.events || [];
            const isLucky = info.is_lucky === true || info.is_lucky === 1;
            const isFujojubi = info.is_fujojubi === true || info.is_fujojubi === 1;

            const hasTensha = events.includes('天赦日');
            const hasIchiryumanbai = events.includes('一粒万倍日');
            const hasTora = events.includes('寅の日');
            const hasMi = events.includes('巳の日') || events.includes('己巳の日');

            if (hasTensha && hasIchiryumanbai) {
                createBanner('最強開運大吉日 (天赦日 + 一粒万倍日)', 'super-lucky');
            } else if (hasTensha) {
                createBanner('天赦日 (最高峰の開運大吉日)', 'super-lucky');
            } else if (hasIchiryumanbai && (rokuyou === '大安' || hasTora || hasMi)) {
                createBanner('金運招来大吉日 (吉日重複)', 'money-lucky');
            }

            if (isFujojubi) {
                createBanner('不成就日 (凶日と重なっています)', 'fujojubi-warning');
            }

            // 3. Events List
            // Add Rokuyou event if any
            if (rokuyou) {
                createEventItem(rokuyou, eventExplanations[rokuyou] || '六曜の記述。', true);
            }

            // Add Lucky Events
            events.forEach(eventName => {
                if (eventName !== rokuyou) {
                    createEventItem(eventName, eventExplanations[eventName] || '特別な暦上の開運日。');
                }
            });

            if (isFujojubi) {
                createEventItem('不成就日', eventExplanations['不成就日'] || '何事も成就しないとされる凶日。', false, true);
            }

            // 4. Advice
            let adviceHtml = '';
            if (hasTensha && hasIchiryumanbai) {
                adviceHtml = '<p><strong>天赦日</strong>と<strong>一粒万倍日</strong>が重なる、一年に数回しかない<strong>最強の超大吉日</strong>です。ロトの高額当選を狙って購入するのに、これ以上ない最高の日です！</p>';
            } else if (hasTensha) {
                adviceHtml = '<p>天が万物の罪を許す、暦上で<strong>最高レベルの開運大吉日</strong>です。新しい財布の使い始めや、宝くじ購入など、大きな決断に最適な日です。</p>';
            } else if (isFujojubi) {
                if (isLucky) {
                    adviceHtml = '<p>一粒万倍日などの吉日と重なっていますが、<strong>不成就日（凶日）</strong>の影響でパワーが抑えられています。気になる場合は、他の安定した吉日に購入することをおすすめします。</p>';
                } else {
                    adviceHtml = '<p>本日は<strong>不成就日</strong>です。物事が上手くいきにくい日とされているため、無理にロトを購入することは避け、次の吉日のために数字をじっくり選ぶ日にすると良いでしょう。</p>';
                }
            } else if (hasIchiryumanbai) {
                if (rokuyou === '大安') {
                    adviceHtml = '<p><strong>大安</strong>と<strong>一粒万倍日</strong>が重なる非常に縁起の良い吉日です。ロトのまとめ買いや、スマートなAI予想で購入に挑戦してみるのに最適です！</p>';
                } else {
                    adviceHtml = '<p><strong>一粒万倍日</strong>です。「一粒の種が万倍に実る」とされる日で、宝くじの購入に非常に適しています。小さな投資が大きくなって戻ってくるかもしれません。</p>';
                }
            } else if (hasTora) {
                adviceHtml = '<p><strong>寅の日</strong>は「使ったお金がすぐに戻ってくる」と言われる<strong>金運の吉日</strong>です。ロトの購入は金運パワーが高まるこのタイミングが最適です。</p>';
            } else if (hasMi) {
                adviceHtml = '<p>弁財天の使いである蛇（巳）に由来する、<strong>金運・財運に直結する吉日</strong>です。ロトの当選確率アップを祈願して購入するのにとても良い日です。</p>';
            } else if (rokuyou === '大安') {
                adviceHtml = '<p><strong>大安吉日</strong>です。何をやっても万事が上手く進むとされる安泰の日です。迷いなく予想した数字で購入に臨むと良いでしょう。</p>';
            } else if (rokuyou === '仏滅') {
                adviceHtml = '<p>本日は<strong>仏滅</strong>です。万事において最も縁起が悪く、新しい事や大きな買い物は避けた方が良いとされる日です。今日は運を温存しておきましょう。</p>';
            } else {
                adviceHtml = '<p>目立った吉凶のない通常の日です。Loto OracleのAIシミュレーターを使い、過去データに基づいた冷静な数字分析を行うのに最適です。</p>';
            }

            webLuckyAdviceBox.innerHTML = adviceHtml;
        }

        function createBanner(text, typeClass) {
            const banner = document.createElement('div');
            banner.className = `special-banner ${typeClass}`;
            banner.textContent = text;
            webSpecialBanners.appendChild(banner);
        }

        function createEventItem(name, explanation, isRokuyou = false, isFujojubi = false) {
            const item = document.createElement('div');
            item.className = 'event-item';

            const badge = document.createElement('span');
            badge.className = 'event-badge';
            badge.textContent = name;
            
            if (isRokuyou) badge.classList.add('rokuyou');
            if (isFujojubi) badge.classList.add('fujojubi');

            const desc = document.createElement('span');
            desc.className = 'event-desc';
            desc.textContent = explanation;

            item.appendChild(badge);
            item.appendChild(desc);
            webLuckyEventsList.appendChild(item);
        }

        function formatDateKey(date) {
            const y = date.getFullYear();
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const d = String(date.getDate()).padStart(2, '0');
            return `${y}-${m}-${d}`;
        }
    });
})();

// FAQ Accordion Toggle
document.addEventListener('DOMContentLoaded', () => {
    const faqItems = document.querySelectorAll('.faq-item');
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        question.addEventListener('click', () => {
            const isActive = item.classList.contains('active');
            // Close all items
            faqItems.forEach(el => el.classList.remove('active'));
            // Open clicked item if it wasn't active
            if (!isActive) {
                item.classList.add('active');
            }
        });
    });
});

