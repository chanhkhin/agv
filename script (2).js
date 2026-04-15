const eraWidget = new EraWidget();
let actionV1, actionV2, actionV3; // Chân gửi lệnh
let configUID; // Chân nhận UID (V4)

let tempCheckpoints = []; 
let savedCheckpoints = JSON.parse(localStorage.getItem('AGV_Checkpoints')) || [];

const uidInput = document.getElementById('uidInput');
const checkpointListDiv = document.getElementById('checkpointList');
const gotoListDiv = document.getElementById('gotoList');

eraWidget.init({
    onConfiguration: (conf) => {
        // Cấu hình Action (V1, V2, V3)
        if(conf.actions) {
            actionV1 = conf.actions[0]; 
            actionV2 = conf.actions[1]; 
            actionV3 = conf.actions[2]; 
        }
        // Cấu hình Realtime (V4)
        if(conf.realtime_configs && conf.realtime_configs.length > 0) {
            configUID = conf.realtime_configs[0]; 
        }
    },
    onValues: (values) => {
        // Tự động bắt UID khi ESP32 gửi lên
        if (configUID && values[configUID.id]) {
            const receivedUID = values[configUID.id].value;
            if (receivedUID && String(receivedUID).trim() !== "") {
                uidInput.value = receivedUID;
                // Hiệu ứng nháy xanh khi nhận thẻ mới
                uidInput.style.borderColor = "#00ffcc";
                setTimeout(() => uidInput.style.borderColor = "#444", 500);
            }
        }
    }
});

function renderUI() {
    checkpointListDiv.innerHTML = '';
    let displayList = tempCheckpoints.length > 0 ? tempCheckpoints : savedCheckpoints;
    
    displayList.forEach((cp, index) => {
        const letter = String.fromCharCode(65 + index);
        const card = document.createElement('div');
        card.className = 'point-card';
        card.innerHTML = `<span class="letter">${letter}</span><span class="uid-label">${cp.uid}</span>`;
        checkpointListDiv.appendChild(card);
    });

    gotoListDiv.innerHTML = '';
    if (savedCheckpoints.length === 0) {
        gotoListDiv.innerHTML = '<div class="no-data-msg">Chưa có điểm lưu. Hãy quét thẻ và nhấn +.</div>';
    } else {
        savedCheckpoints.forEach((cp, index) => {
            const letter = String.fromCharCode(65 + index);
            const btn = document.createElement('button');
            btn.className = 'btn-goto';
            btn.innerHTML = `GOTO ĐIỂM ${letter} <span>[${cp.uid}]</span>`;
            btn.addEventListener('click', () => {
                let cmdNumeric = 2001 + index;
                if (actionV3) eraWidget.triggerAction(actionV3.action, null, { value: cmdNumeric });
                btn.style.background = "#FF5500";
                setTimeout(() => btn.style.background = "", 300);
            });
            gotoListDiv.appendChild(btn);
        });
    }
}

// Nhấn nút + để lưu vào danh sách
document.getElementById('btnAdd').addEventListener('click', () => {
    const uid = uidInput.value.trim();
    if (uid === "") return alert("Chưa có mã UID nào!");
    
    let currentList = tempCheckpoints.length > 0 ? tempCheckpoints : [...savedCheckpoints];
    currentList.push({ uid: uid });
    tempCheckpoints = currentList;
    
    uidInput.value = ""; // Xóa trắng để đợi thẻ tiếp theo
    renderUI();
});

document.getElementById('btnSave').addEventListener('click', () => {
    if (tempCheckpoints.length > 0) {
        savedCheckpoints = [...tempCheckpoints];
        localStorage.setItem('AGV_Checkpoints', JSON.stringify(savedCheckpoints));
        tempCheckpoints = [];
        alert("Đã lưu lộ trình!");
        renderUI();
    }
});

document.getElementById('btnReset').addEventListener('click', () => {
    if(confirm("Xóa hết lộ trình?")) {
        tempCheckpoints = [];
        savedCheckpoints = [];
        localStorage.removeItem('AGV_Checkpoints');
        renderUI();
    }
});

// Chuyển chế độ
const btnManual = document.getElementById('btnManual');
const btnAuto = document.getElementById('btnAuto');
btnManual.addEventListener('click', () => {
    btnManual.classList.add('active-manual'); btnAuto.classList.remove('active-auto');
    document.getElementById('autoPanel').classList.remove('show');
    document.getElementById('manualPanel').classList.remove('hidden');
    if (actionV3) eraWidget.triggerAction(actionV3.action, null, { value: 1000 });
});
btnAuto.addEventListener('click', () => {
    btnAuto.classList.add('active-auto'); btnManual.classList.remove('active-manual');
    document.getElementById('autoPanel').classList.add('show');
    document.getElementById('manualPanel').classList.add('hidden');
    renderUI();
    if (actionV3) eraWidget.triggerAction(actionV3.action, null, { value: 2000 });
});

// Joystick điều khiển tay
function sendV1(v) { document.getElementById('labelRight').textContent = v; if(actionV1) eraWidget.triggerAction(actionV1.action, null, {value: v}); }
function sendV2(v) { document.getElementById('labelLeft').textContent = v; if(actionV2) eraWidget.triggerAction(actionV2.action, null, {value: v}); }
const bindBtn = (id, vDown, vUp, func) => {
    const b = document.getElementById(id);
    b.addEventListener('pointerdown', () => func(vDown));
    b.addEventListener('pointerup', () => func(vUp));
    b.addEventListener('pointerleave', () => func(vUp));
};
bindBtn('btnUp', 2025, 1494, sendV1); bindBtn('btnDown', 1027, 1494, sendV1);
bindBtn('btnLeft', 987, 1497, sendV2); bindBtn('btnRight', 1983, 1497, sendV2);

renderUI();