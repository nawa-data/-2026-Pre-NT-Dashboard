// App Logic & State Management for Pre NT Dashboard SPA with Official NT Quality Criteria
document.addEventListener('DOMContentLoaded', () => {
    if (typeof NT_DATA === 'undefined') {
        console.error('NT_DATA dataset is not loaded!');
        return;
    }

    // App State
    const state = {
        type: 'all',          // 'all', 'เด็กปกติ', 'เด็กพิเศษ'
        subject: 'both',      // 'both', 'th', 'ma'
        center: 'all',        // 'all' or centerName
        school: 'all',        // 'all' or schoolName
        search: '',
        tab: 'tabDistrict',   // 'tabDistrict', 'tabCenter', 'tabSchool'
        selectedCenterCard: NT_DATA.centers[0] || '',
        schoolSort: { col: 'tot_pct', dir: 'desc' },
        schoolPage: 1,
        schoolPageSize: 15,
        modalSchool: null,
        modalSearch: '',
        criteriaOpen: false
    };

    // Chart instances
    let chartCenterCompareInst = null;
    let chartQualityDonutInst = null;
    let chartCenterSchoolsInst = null;

    // DOM Elements
    const selectCenter = document.getElementById('selectCenter');
    const selectSchool = document.getElementById('selectSchool');
    const inputSearch = document.getElementById('inputSearch');
    const btnResetFilter = document.getElementById('btnResetFilter');
    const btnExportCSV = document.getElementById('btnExportCSV');
    const btnPrint = document.getElementById('btnPrint');

    // Official Quality Level Helper Function per subject
    function getQualityLevel(pct, subject) {
        if (subject === 'th') {
            if (pct >= 70.0) return 'ดีมาก';
            if (pct >= 50.0) return 'ดี';
            if (pct >= 29.0) return 'พอใช้';
            return 'ปรับปรุง';
        } else if (subject === 'ma') {
            if (pct >= 67.0) return 'ดีมาก';
            if (pct >= 44.0) return 'ดี';
            if (pct >= 26.0) return 'พอใช้';
            return 'ปรับปรุง';
        } else { // 'both'
            if (pct >= 68.5) return 'ดีมาก';
            if (pct >= 47.0) return 'ดี';
            if (pct >= 27.5) return 'พอใช้';
            return 'ปรับปรุง';
        }
    }

    function getQualityBadgeHTML(level) {
        if (level === 'ดีมาก') return '<span class="badge badge-excellent"><i class="fa-solid fa-star"></i> ดีมาก</span>';
        if (level === 'ดี') return '<span class="badge badge-good"><i class="fa-solid fa-thumbs-up"></i> ดี</span>';
        if (level === 'พอใช้') return '<span class="badge badge-fair"><i class="fa-solid fa-minus"></i> พอใช้</span>';
        return '<span class="badge badge-need-imp"><i class="fa-solid fa-triangle-exclamation"></i> ปรับปรุง</span>';
    }

    // Initialize UI
    initDropdowns();
    initEventListeners();
    updateApp();

    // -------------------------------------------------------------
    // Dropdown Initializer
    // -------------------------------------------------------------
    function initDropdowns() {
        NT_DATA.centers.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c;
            opt.textContent = c;
            selectCenter.appendChild(opt);
        });

        updateSchoolDropdown();
    }

    function updateSchoolDropdown() {
        const currentCenter = selectCenter.value;
        selectSchool.innerHTML = '<option value="all">ทุกโรงเรียน (253 โรงเรียน)</option>';

        const filteredSchools = currentCenter === 'all' 
            ? NT_DATA.schools 
            : NT_DATA.schools.filter(s => s.center === currentCenter);

        filteredSchools.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.name;
            opt.textContent = s.name;
            selectSchool.appendChild(opt);
        });
    }

    // -------------------------------------------------------------
    // Event Listeners
    // -------------------------------------------------------------
    function initEventListeners() {
        // Toggle Criteria Card
        const criteriaHeader = document.getElementById('headerCriteriaToggle');
        const criteriaBody = document.getElementById('bodyCriteria');
        const criteriaBadge = document.getElementById('badgeCriteriaStatus');

        criteriaHeader.addEventListener('click', () => {
            state.criteriaOpen = !state.criteriaOpen;
            if (state.criteriaOpen) {
                criteriaBody.style.display = 'block';
                criteriaBadge.innerHTML = 'ซ่อนเกณฑ์คะแนน <i class="fa-solid fa-chevron-up"></i>';
            } else {
                criteriaBody.style.display = 'none';
                criteriaBadge.innerHTML = 'ดูเกณฑ์ตารางคะแนน <i class="fa-solid fa-chevron-down"></i>';
            }
        });

        // Segmented Type
        document.querySelectorAll('#segType .segmented-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('#segType .segmented-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                state.type = btn.dataset.type;
                updateApp();
            });
        });

        // Segmented Subject
        document.querySelectorAll('#segSubject .segmented-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('#segSubject .segmented-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                state.subject = btn.dataset.subject;
                updateApp();
            });
        });

        // Select Center
        selectCenter.addEventListener('change', () => {
            state.center = selectCenter.value;
            state.school = 'all';
            updateSchoolDropdown();
            state.schoolPage = 1;
            updateApp();
        });

        // Select School
        selectSchool.addEventListener('change', () => {
            state.school = selectSchool.value;
            state.schoolPage = 1;
            updateApp();
        });

        // Search Input
        inputSearch.addEventListener('input', (e) => {
            state.search = e.target.value.trim().toLowerCase();
            state.schoolPage = 1;
            updateApp();
        });

        // Reset Filter
        btnResetFilter.addEventListener('click', () => {
            state.type = 'all';
            state.subject = 'both';
            state.center = 'all';
            state.school = 'all';
            state.search = '';
            state.schoolPage = 1;

            document.querySelectorAll('#segType .segmented-btn').forEach(b => b.classList.toggle('active', b.dataset.type === 'all'));
            document.querySelectorAll('#segSubject .segmented-btn').forEach(b => b.classList.toggle('active', b.dataset.subject === 'both'));
            selectCenter.value = 'all';
            updateSchoolDropdown();
            selectSchool.value = 'all';
            inputSearch.value = '';

            updateApp();
        });

        // Tab Switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));

                btn.classList.add('active');
                state.tab = btn.dataset.tab;
                document.getElementById(state.tab).classList.add('active');

                updateApp();
            });
        });

        // Export CSV & Print
        btnExportCSV.addEventListener('click', exportCSV);
        btnPrint.addEventListener('click', () => window.print());

        // Modal Controls
        document.getElementById('btnModalClose').addEventListener('click', closeModal);
        document.getElementById('schoolModal').addEventListener('click', (e) => {
            if (e.target.id === 'schoolModal') closeModal();
        });

        document.getElementById('inputModalSearch').addEventListener('input', (e) => {
            state.modalSearch = e.target.value.trim().toLowerCase();
            if (state.modalSchool) renderModalStudentTable(state.modalSchool);
        });

        // School Sort Headers
        document.querySelectorAll('#tableSchools th.sortable').forEach(th => {
            th.addEventListener('click', () => {
                const col = th.dataset.sort;
                if (state.schoolSort.col === col) {
                    state.schoolSort.dir = state.schoolSort.dir === 'asc' ? 'desc' : 'asc';
                } else {
                    state.schoolSort.col = col;
                    state.schoolSort.dir = 'desc';
                }
                renderTabSchool(getFilteredStudents());
            });
        });
    }

    // -------------------------------------------------------------
    // Data Filtering & Stats Engine
    // -------------------------------------------------------------
    function getFilteredStudents() {
        return NT_DATA.students.filter(st => {
            if (state.type !== 'all' && st.type !== state.type) return false;
            if (state.center !== 'all' && st.center !== state.center) return false;
            if (state.school !== 'all' && st.school !== state.school) return false;
            
            if (state.search) {
                const matchName = st.name.toLowerCase().includes(state.search);
                const matchSchool = st.school.toLowerCase().includes(state.search);
                const matchCenter = st.center.toLowerCase().includes(state.search);
                if (!matchName && !matchSchool && !matchCenter) return false;
            }

            return true;
        });
    }

    function calculateStats(students) {
        const totalCount = students.length;
        const examinees = students.filter(s => s.status === 'เข้าสอบ');
        const examineeCount = examinees.length;
        const examRate = totalCount > 0 ? (examineeCount / totalCount * 100) : 0;

        if (examineeCount === 0) {
            return {
                totalCount, examineeCount, examRate: 0,
                thAvg: 0, thPct: 0, maAvg: 0, maPct: 0, bothAvg: 0, bothPct: 0,
                quality: { excellent: 0, good: 0, fair: 0, needImp: 0 }
            };
        }

        const thSum = examinees.reduce((acc, s) => acc + s.th_tot, 0);
        const maSum = examinees.reduce((acc, s) => acc + s.ma_tot, 0);
        const bothSum = examinees.reduce((acc, s) => acc + s.tot_200, 0);

        const thAvg = thSum / examineeCount;
        const maAvg = maSum / examineeCount;
        const bothAvg = bothSum / examineeCount;

        const thPct = thAvg;
        const maPct = maAvg;
        const bothPct = bothAvg / 2;

        // Quality level distribution evaluated using official criteria for current subject mode
        const quality = { excellent: 0, good: 0, fair: 0, needImp: 0 };

        examinees.forEach(s => {
            let level = 'ปรับปรุง';
            if (state.subject === 'th') level = s.th_level;
            else if (state.subject === 'ma') level = s.ma_level;
            else level = s.tot_level;

            if (level === 'ดีมาก') quality.excellent++;
            else if (level === 'ดี') quality.good++;
            else if (level === 'พอใช้') quality.fair++;
            else if (level === 'ปรับปรุง') quality.needImp++;
        });

        return {
            totalCount, examineeCount, examRate,
            thAvg, thPct, maAvg, maPct, bothAvg, bothPct,
            quality
        };
    }

    // -------------------------------------------------------------
    // App Update Router
    // -------------------------------------------------------------
    function updateApp() {
        const filteredStudents = getFilteredStudents();
        const overallStats = calculateStats(filteredStudents);

        renderKPIs(overallStats);

        if (state.tab === 'tabDistrict') {
            renderTabDistrict(filteredStudents, overallStats);
        } else if (state.tab === 'tabCenter') {
            renderTabCenter(filteredStudents);
        } else if (state.tab === 'tabSchool') {
            renderTabSchool(filteredStudents);
        }
    }

    // -------------------------------------------------------------
    // Render KPIs & Quality Banner
    // -------------------------------------------------------------
    function renderKPIs(stats) {
        document.getElementById('kpiExaminees').textContent = stats.examineeCount.toLocaleString();
        document.getElementById('kpiTotalStudents').textContent = stats.totalCount.toLocaleString();
        document.getElementById('kpiExamRate').textContent = `${stats.examRate.toFixed(1)}%`;

        document.getElementById('kpiBothAvg').textContent = stats.bothAvg.toFixed(2);
        document.getElementById('kpiBothPct').textContent = `${stats.bothPct.toFixed(2)}%`;
        const bothLvl = getQualityLevel(stats.bothPct, 'both');
        document.getElementById('kpiBothLevel').className = `badge ${bothLvl === 'ดีมาก' ? 'badge-excellent' : (bothLvl === 'ดี' ? 'badge-good' : (bothLvl === 'พอใช้' ? 'badge-fair' : 'badge-need-imp'))}`;
        document.getElementById('kpiBothLevel').textContent = bothLvl;

        document.getElementById('kpiThAvg').textContent = stats.thAvg.toFixed(2);
        document.getElementById('kpiThPct').textContent = `${stats.thPct.toFixed(2)}%`;
        const thLvl = getQualityLevel(stats.thPct, 'th');
        document.getElementById('kpiThLevel').className = `badge ${thLvl === 'ดีมาก' ? 'badge-excellent' : (thLvl === 'ดี' ? 'badge-good' : (thLvl === 'พอใช้' ? 'badge-fair' : 'badge-need-imp'))}`;
        document.getElementById('kpiThLevel').textContent = thLvl;

        document.getElementById('kpiMaAvg').textContent = stats.maAvg.toFixed(2);
        document.getElementById('kpiMaPct').textContent = `${stats.maPct.toFixed(2)}%`;
        const maLvl = getQualityLevel(stats.maPct, 'ma');
        document.getElementById('kpiMaLevel').className = `badge ${maLvl === 'ดีมาก' ? 'badge-excellent' : (maLvl === 'ดี' ? 'badge-good' : (maLvl === 'พอใช้' ? 'badge-fair' : 'badge-need-imp'))}`;
        document.getElementById('kpiMaLevel').textContent = maLvl;

        // Quality Banner Cards
        const totalEx = stats.examineeCount || 1;
        document.getElementById('qCntExcellent').textContent = `${stats.quality.excellent.toLocaleString()} คน`;
        document.getElementById('qPctExcellent').textContent = `${(stats.quality.excellent / totalEx * 100).toFixed(1)}%`;

        document.getElementById('qCntGood').textContent = `${stats.quality.good.toLocaleString()} คน`;
        document.getElementById('qPctGood').textContent = `${(stats.quality.good / totalEx * 100).toFixed(1)}%`;

        document.getElementById('qCntFair').textContent = `${stats.quality.fair.toLocaleString()} คน`;
        document.getElementById('qPctFair').textContent = `${(stats.quality.fair / totalEx * 100).toFixed(1)}%`;

        document.getElementById('qCntNeedImp').textContent = `${stats.quality.needImp.toLocaleString()} คน`;
        document.getElementById('qPctNeedImp').textContent = `${(stats.quality.needImp / totalEx * 100).toFixed(1)}%`;
    }

    // -------------------------------------------------------------
    // TAB 1: District View
    // -------------------------------------------------------------
    function renderTabDistrict(filteredStudents, overallStats) {
        const centerData = NT_DATA.centers.map(cName => {
            const cStudents = filteredStudents.filter(s => s.center === cName);
            const stats = calculateStats(cStudents);
            const schoolsCount = new Set(cStudents.map(s => s.school)).size;
            const qualityLevel = getQualityLevel(stats.bothPct, 'both');
            return {
                center: cName,
                schoolsCount,
                qualityLevel,
                ...stats
            };
        });

        centerData.sort((a, b) => b.bothPct - a.bothPct);

        const tbody = document.querySelector('#tableCenters tbody');
        tbody.innerHTML = '';

        centerData.forEach((cd, idx) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="text-align: center; font-weight: 700;">${idx + 1}</td>
                <td style="font-weight: 600;"><i class="fa-solid fa-sitemap" style="color: var(--color-ma); margin-right: 6px;"></i> ${cd.center}</td>
                <td style="text-align: center;">${cd.schoolsCount}</td>
                <td style="text-align: center;">${cd.totalCount}</td>
                <td style="text-align: center;">${cd.examineeCount}</td>
                <td style="text-align: right; color: var(--color-th); font-weight: 600;">${cd.thAvg.toFixed(2)}</td>
                <td style="text-align: right; color: var(--color-ma); font-weight: 600;">${cd.maAvg.toFixed(2)}</td>
                <td style="text-align: right; color: var(--color-both); font-weight: 700;">${cd.bothAvg.toFixed(2)}</td>
                <td style="text-align: right;"><strong>${cd.bothPct.toFixed(2)}%</strong></td>
                <td style="text-align: center;">${getQualityBadgeHTML(cd.qualityLevel)}</td>
                <td style="text-align: center;">
                    <button class="btn btn-outline btn-sm btn-view-center" data-center="${cd.center}">
                        <i class="fa-solid fa-eye"></i> ดูข้อมูล
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        tbody.querySelectorAll('.btn-view-center').forEach(btn => {
            btn.addEventListener('click', () => {
                state.selectedCenterCard = btn.dataset.center;
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
                const targetTab = document.querySelector('[data-tab="tabCenter"]');
                targetTab.classList.add('active');
                document.getElementById('tabCenter').classList.add('active');
                state.tab = 'tabCenter';
                updateApp();
            });
        });

        updateDistrictCharts(centerData, overallStats.quality);
    }

    function updateDistrictCharts(centerData, qualityStats) {
        const ctxCompare = document.getElementById('chartCenterCompare').getContext('2d');
        const labels = centerData.map(c => c.center);
        
        let datasets = [];

        if (state.subject === 'both') {
            datasets = [
                {
                    label: 'เฉลี่ย ภาษาไทย (100)',
                    data: centerData.map(c => c.thAvg),
                    backgroundColor: '#10B981',
                    borderRadius: 4
                },
                {
                    label: 'เฉลี่ย คณิตศาสตร์ (100)',
                    data: centerData.map(c => c.maAvg),
                    backgroundColor: '#3B82F6',
                    borderRadius: 4
                }
            ];
        } else if (state.subject === 'th') {
            datasets = [
                {
                    label: 'เฉลี่ย ภาษาไทย (100)',
                    data: centerData.map(c => c.thAvg),
                    backgroundColor: '#10B981',
                    borderRadius: 4
                }
            ];
        } else {
            datasets = [
                {
                    label: 'เฉลี่ย คณิตศาสตร์ (100)',
                    data: centerData.map(c => c.maAvg),
                    backgroundColor: '#3B82F6',
                    borderRadius: 4
                }
            ];
        }

        if (chartCenterCompareInst) chartCenterCompareInst.destroy();

        chartCenterCompareInst = new Chart(ctxCompare, {
            type: 'bar',
            data: { labels, datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'top', labels: { font: { family: 'Prompt' } } } },
                scales: {
                    y: { beginAtZero: true, max: 100, grid: { color: '#F1F5F9' } },
                    x: { ticks: { font: { family: 'Prompt', size: 11 } } }
                }
            }
        });

        const ctxDonut = document.getElementById('chartQualityDonut').getContext('2d');
        if (chartQualityDonutInst) chartQualityDonutInst.destroy();

        chartQualityDonutInst = new Chart(ctxDonut, {
            type: 'doughnut',
            data: {
                labels: ['ดีมาก', 'ดี', 'พอใช้', 'ปรับปรุง'],
                datasets: [{
                    data: [qualityStats.excellent, qualityStats.good, qualityStats.fair, qualityStats.needImp],
                    backgroundColor: ['#059669', '#2563EB', '#D97706', '#DC2626'],
                    borderWidth: 2,
                    borderColor: '#FFFFFF'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom', labels: { font: { family: 'Prompt' } } } }
            }
        });
    }

    // -------------------------------------------------------------
    // TAB 2: Network Center View
    // -------------------------------------------------------------
    function renderTabCenter(filteredStudents) {
        const gridContainer = document.getElementById('centerCardsGrid');
        gridContainer.innerHTML = '';

        NT_DATA.centers.forEach(cName => {
            const cStudents = filteredStudents.filter(s => s.center === cName);
            const stats = calculateStats(cStudents);
            const schCount = new Set(cStudents.map(s => s.school)).size;

            const card = document.createElement('div');
            card.className = `center-card ${state.selectedCenterCard === cName ? 'active' : ''}`;
            card.innerHTML = `
                <div class="center-card-header">
                    <span class="center-card-title">${cName}</span>
                    <span class="badge badge-normal">${schCount} โรงเรียน</span>
                </div>
                <div class="center-card-stats">
                    <div>
                        <div class="center-stat-val" style="color: var(--color-th);">${stats.thAvg.toFixed(1)}</div>
                        <div class="center-stat-lbl">ภาษาไทย</div>
                    </div>
                    <div>
                        <div class="center-stat-val" style="color: var(--color-ma);">${stats.maAvg.toFixed(1)}</div>
                        <div class="center-stat-lbl">คณิตศาสตร์</div>
                    </div>
                    <div>
                        <div class="center-stat-val" style="color: var(--color-both);">${stats.bothAvg.toFixed(1)}</div>
                        <div class="center-stat-lbl">รวม 2 วิชา</div>
                    </div>
                </div>
            `;

            card.addEventListener('click', () => {
                state.selectedCenterCard = cName;
                renderTabCenter(filteredStudents);
            });

            gridContainer.appendChild(card);
        });

        if (state.selectedCenterCard) {
            renderCenterDetail(state.selectedCenterCard, filteredStudents);
        }
    }

    function renderCenterDetail(centerName, filteredStudents) {
        const detailCard = document.getElementById('centerDetailCard');
        detailCard.style.display = 'block';

        document.getElementById('selectedCenterTitle').textContent = `ข้อมูลเจาะลึก: ศูนย์เครือข่าย ${centerName}`;

        const cStudents = filteredStudents.filter(s => s.center === centerName);
        const cStats = calculateStats(cStudents);

        document.getElementById('selectedCenterMeta').innerHTML = `
            ผู้เข้าสอบ: <strong>${cStats.examineeCount}</strong> คน | 
            เฉลี่ย ภาษาไทย: <strong style="color: var(--color-th);">${cStats.thAvg.toFixed(2)}</strong> | 
            เฉลี่ย คณิตศาสตร์: <strong style="color: var(--color-ma);">${cStats.maAvg.toFixed(2)}</strong> | 
            เฉลี่ย รวม 2 วิชา: <strong style="color: var(--color-both);">${cStats.bothAvg.toFixed(2)} (${cStats.bothPct.toFixed(2)}%)</strong>
        `;

        const schoolMap = {};
        cStudents.forEach(s => {
            if (!schoolMap[s.school]) schoolMap[s.school] = [];
            schoolMap[s.school].push(s);
        });

        const schoolList = Object.keys(schoolMap).map(schName => {
            const schStudents = schoolMap[schName];
            const stats = calculateStats(schStudents);
            const qualityLevel = getQualityLevel(stats.bothPct, 'both');
            return {
                school: schName,
                qualityLevel,
                ...stats
            };
        });

        schoolList.sort((a, b) => b.bothPct - a.bothPct);

        const tbody = document.querySelector('#tableCenterSchools tbody');
        tbody.innerHTML = '';

        schoolList.forEach((sch, idx) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="text-align: center;">${idx + 1}</td>
                <td style="font-weight: 600;">${sch.school}</td>
                <td style="text-align: center;">${sch.examineeCount}</td>
                <td style="text-align: right; color: var(--color-th); font-weight: 600;">${sch.thAvg.toFixed(2)}</td>
                <td style="text-align: right; color: var(--color-ma); font-weight: 600;">${sch.maAvg.toFixed(2)}</td>
                <td style="text-align: right; color: var(--color-both); font-weight: 700;">${sch.bothAvg.toFixed(2)}</td>
                <td style="text-align: right;"><strong>${sch.bothPct.toFixed(2)}%</strong></td>
                <td style="text-align: center;">${getQualityBadgeHTML(sch.qualityLevel)}</td>
                <td style="text-align: center;">
                    <button class="btn btn-primary btn-sm btn-drill-school" data-school="${sch.school}">
                        <i class="fa-solid fa-users"></i> นักเรียน
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        tbody.querySelectorAll('.btn-drill-school').forEach(btn => {
            btn.addEventListener('click', () => openModal(btn.dataset.school));
        });

        const ctx = document.getElementById('chartCenterSchools').getContext('2d');
        if (chartCenterSchoolsInst) chartCenterSchoolsInst.destroy();

        chartCenterSchoolsInst = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: schoolList.map(s => s.school),
                datasets: [
                    {
                        label: 'เฉลี่ย ภาษาไทย',
                        data: schoolList.map(s => s.thAvg),
                        backgroundColor: '#10B981'
                    },
                    {
                        label: 'เฉลี่ย คณิตศาสตร์',
                        data: schoolList.map(s => s.maAvg),
                        backgroundColor: '#3B82F6'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'top' } },
                scales: { y: { beginAtZero: true, max: 100 } }
            }
        });
    }

    // -------------------------------------------------------------
    // TAB 3: School View & Leaderboard
    // -------------------------------------------------------------
    function renderTabSchool(filteredStudents) {
        const schoolMap = {};
        filteredStudents.forEach(s => {
            if (!schoolMap[s.school]) {
                schoolMap[s.school] = { school: s.school, center: s.center, students: [] };
            }
            schoolMap[s.school].students.push(s);
        });

        let schoolList = Object.values(schoolMap).map(item => {
            const stats = calculateStats(item.students);
            const qualityLevel = getQualityLevel(stats.bothPct, 'both');
            return {
                school: item.school,
                center: item.center,
                examinees: stats.examineeCount,
                th_avg: stats.thAvg,
                ma_avg: stats.maAvg,
                tot_avg: stats.bothAvg,
                tot_pct: stats.bothPct,
                qualityLevel
            };
        });

        const { col, dir } = state.schoolSort;
        schoolList.sort((a, b) => {
            let valA = a[col];
            let valB = b[col];
            if (typeof valA === 'string') {
                return dir === 'asc' ? valA.localeCompare(valB, 'th') : valB.localeCompare(valA, 'th');
            }
            return dir === 'asc' ? valA - valB : valB - valA;
        });

        document.getElementById('schoolFilteredCount').textContent = schoolList.length;

        const totalItems = schoolList.length;
        const totalPages = Math.ceil(totalItems / state.schoolPageSize) || 1;
        if (state.schoolPage > totalPages) state.schoolPage = totalPages;

        const startIdx = (state.schoolPage - 1) * state.schoolPageSize;
        const pageItems = schoolList.slice(startIdx, startIdx + state.schoolPageSize);

        const tbody = document.querySelector('#tableSchools tbody');
        tbody.innerHTML = '';

        pageItems.forEach((sch, idx) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="text-align: center; font-weight: 600;">${startIdx + idx + 1}</td>
                <td style="font-weight: 600; color: var(--text-main);"><i class="fa-solid fa-school" style="color: var(--color-ma); margin-right: 6px;"></i> ${sch.school}</td>
                <td><span class="badge badge-normal">${sch.center}</span></td>
                <td style="text-align: center;">${sch.examinees}</td>
                <td style="text-align: right; color: var(--color-th); font-weight: 600;">${sch.th_avg.toFixed(2)}</td>
                <td style="text-align: right; color: var(--color-ma); font-weight: 600;">${sch.ma_avg.toFixed(2)}</td>
                <td style="text-align: right; color: var(--color-both); font-weight: 700;">${sch.tot_avg.toFixed(2)}</td>
                <td style="text-align: right;"><strong>${sch.tot_pct.toFixed(2)}%</strong></td>
                <td style="text-align: center;">${getQualityBadgeHTML(sch.qualityLevel)}</td>
                <td style="text-align: center;">
                    <button class="btn btn-primary btn-sm btn-drill-school" data-school="${sch.school}">
                        <i class="fa-solid fa-users-line"></i> เจาะลึก
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        tbody.querySelectorAll('.btn-drill-school').forEach(btn => {
            btn.addEventListener('click', () => openModal(btn.dataset.school));
        });

        renderPagination(totalItems, totalPages);
    }

    function renderPagination(totalItems, totalPages) {
        const info = document.getElementById('schoolPagInfo');
        const controls = document.getElementById('schoolPagControls');

        const start = totalItems === 0 ? 0 : (state.schoolPage - 1) * state.schoolPageSize + 1;
        const end = Math.min(state.schoolPage * state.schoolPageSize, totalItems);
        info.textContent = `แสดง ${start} ถึง ${end} จาก ${totalItems} โรงเรียน`;

        controls.innerHTML = '';

        const prevBtn = document.createElement('button');
        prevBtn.className = 'page-btn';
        prevBtn.innerHTML = '<i class="fa-solid fa-chevron-left"></i>';
        prevBtn.disabled = state.schoolPage === 1;
        prevBtn.addEventListener('click', () => { state.schoolPage--; updateApp(); });
        controls.appendChild(prevBtn);

        let startPage = Math.max(1, state.schoolPage - 2);
        let endPage = Math.min(totalPages, startPage + 4);
        if (endPage - startPage < 4) startPage = Math.max(1, endPage - 4);

        for (let i = startPage; i <= endPage; i++) {
            const btn = document.createElement('button');
            btn.className = `page-btn ${i === state.schoolPage ? 'active' : ''}`;
            btn.textContent = i;
            btn.addEventListener('click', () => { state.schoolPage = i; updateApp(); });
            controls.appendChild(btn);
        }

        const nextBtn = document.createElement('button');
        nextBtn.className = 'page-btn';
        nextBtn.innerHTML = '<i class="fa-solid fa-chevron-right"></i>';
        nextBtn.disabled = state.schoolPage === totalPages;
        nextBtn.addEventListener('click', () => { state.schoolPage++; updateApp(); });
        controls.appendChild(nextBtn);
    }

    // -------------------------------------------------------------
    // Modal Student Drill-down
    // -------------------------------------------------------------
    function openModal(schoolName) {
        state.modalSchool = schoolName;
        state.modalSearch = '';
        document.getElementById('inputModalSearch').value = '';

        const schoolMeta = NT_DATA.schools.find(s => s.name === schoolName);
        document.getElementById('modalSchoolName').textContent = `โรงเรียน${schoolName}`;
        document.getElementById('modalSchoolCenter').textContent = `ศูนย์เครือข่าย${schoolMeta ? schoolMeta.center : ''}`;

        renderModalStudentTable(schoolName);

        const modal = document.getElementById('schoolModal');
        modal.classList.add('show');
        modal.setAttribute('aria-hidden', 'false');
    }

    function closeModal() {
        const modal = document.getElementById('schoolModal');
        modal.classList.remove('show');
        modal.setAttribute('aria-hidden', 'true');
        state.modalSchool = null;
    }

    function renderModalStudentTable(schoolName) {
        const schoolStudents = NT_DATA.students.filter(s => s.school === schoolName);
        const stats = calculateStats(schoolStudents);

        document.getElementById('modalStatExaminees').textContent = `${stats.examineeCount} คน`;
        document.getElementById('modalStatThAvg').textContent = stats.thAvg.toFixed(2);
        document.getElementById('modalStatMaAvg').textContent = stats.maAvg.toFixed(2);
        document.getElementById('modalStatBothAvg').textContent = `${stats.bothAvg.toFixed(2)} (${stats.bothPct.toFixed(2)}%)`;

        let filtered = schoolStudents;
        if (state.modalSearch) {
            filtered = filtered.filter(s => s.name.toLowerCase().includes(state.modalSearch));
        }

        const tbody = document.querySelector('#tableModalStudents tbody');
        tbody.innerHTML = '';

        filtered.forEach((st, idx) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="text-align: center; font-weight: 600;">${idx + 1}</td>
                <td style="font-weight: 600;">${st.prefix} ${st.name}</td>
                <td style="text-align: center;"><span class="badge ${st.type === 'เด็กพิเศษ' ? 'badge-special' : 'badge-normal'}">${st.type}</span></td>
                <td style="text-align: center;">${st.status === 'เข้าสอบ' ? '<span style="color: var(--color-th); font-weight: 600;">เข้าสอบ</span>' : '<span style="color: var(--lvl-need-imp); font-weight: 600;">ขาดสอบ</span>'}</td>
                <td style="text-align: right; color: var(--color-th); font-weight: 600;">${st.status === 'เข้าสอบ' ? st.th_tot.toFixed(1) : '-'}</td>
                <td style="text-align: center;">${st.status === 'เข้าสอบ' ? getQualityBadgeHTML(st.th_level) : '-'}</td>
                <td style="text-align: right; color: var(--color-ma); font-weight: 600;">${st.status === 'เข้าสอบ' ? st.ma_tot.toFixed(1) : '-'}</td>
                <td style="text-align: center;">${st.status === 'เข้าสอบ' ? getQualityBadgeHTML(st.ma_level) : '-'}</td>
                <td style="text-align: right; color: var(--color-both); font-weight: 700;">${st.status === 'เข้าสอบ' ? `${st.tot_200.toFixed(1)} (${st.tot_pct.toFixed(1)}%)` : '-'}</td>
                <td style="text-align: center;">${st.status === 'เข้าสอบ' ? getQualityBadgeHTML(st.tot_level) : '-'}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    // -------------------------------------------------------------
    // Export CSV Engine
    // -------------------------------------------------------------
    function exportCSV() {
        const filtered = getFilteredStudents();
        let csvContent = "\uFEFF";

        csvContent += "ลำดับที่,ศูนย์เครือข่าย,โรงเรียน,คำนำหน้า,ชื่อ-นามสกุล,ประเภทเด็ก,สถานะการสอบ,ภาษาไทย(100),ระดับคุณภาพ(TH),คณิตศาสตร์(100),ระดับคุณภาพ(MA),รวม 2 วิชา(200),ร้อยละรวม,ระดับคุณภาพรวม\n";

        filtered.forEach((s, idx) => {
            const row = [
                idx + 1,
                `"${s.center}"`,
                `"${s.school}"`,
                `"${s.prefix}"`,
                `"${s.name}"`,
                `"${s.type}"`,
                `"${s.status}"`,
                s.th_tot,
                `"${s.th_level}"`,
                s.ma_tot,
                `"${s.ma_level}"`,
                s.tot_200,
                s.tot_pct,
                `"${s.tot_level}"`
            ];
            csvContent += row.join(",") + "\n";
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `Pre_NT_Test1_Dashboard_Export_${new Date().toISOString().slice(0,10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
});
