import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js';
import {
    addDoc,
    arrayUnion,
    collection,
    deleteDoc,
    doc,
    getDocs,
    getFirestore,
    onSnapshot,
    query,
    serverTimestamp,
    updateDoc
} from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';

const firebaseConfig = {
    apiKey: "AIzaSyA-l0qMdkyFbe67fiu8XqMVM1HvzyAHk0Q",
    authDomain: "qr-madness-b48a2.firebaseapp.com",
    projectId: "qr-madness-b48a2",
    storageBucket: "qr-madness-b48a2.firebasestorage.app",
    messagingSenderId: "443651627302",
    appId: "1:443651627302:web:1f6d33199961aa408949e7"
};

const TOTAL_ITEMS = [
    {
        id: 'item01',
        label: 'Meme 01',
        name: 'Drby VŽUUUM',
        description: 'Byl jsi poučen o moci drbů.',
        image: 'items/item01.jpeg'
    },
    {
        id: 'item02',
        label: 'Meme 02',
        name: 'Fotky z brigád',
        description: 'Nu což... hroby se samy neuklidí.',
        image: 'items/item02.JPG'

    },
    {
        id: 'item03',
        label: 'Meme 03',
        name: 'Modlitebky',
        description: 'Jeden z největších green flagů. Fakt.',
        image: 'items/item03.png'
    },
    {
        id: 'item04',
        label: 'Meme 04',
        name: 'Kámoš ve slově',
        description: 'Počkej až se bude mluvit o tobě, ty posměváčku!',
        image: 'items/item04.JPG'
    },
    {
        id: 'item05',
        label: 'Meme 05',
        name: 'Mladší sourozenec',
        description: 'Máme vás rádi i tak, drazí mladší sourozenci.',
        image: 'items/item05.JPG'
    },
    {
        id: 'item06',
        label: 'Meme 06',
        name: 'Noví radikálové',
        description: 'Každý příběh někde začíná...',
        image: 'items/item06.JPG'
    },
    {
        id: 'item07',
        label: 'Meme 07',
        name: 'Pořadatelé',
        description: 'No, někdo to říct musí.',
        image: 'items/item07.JPG'
    },
    {
        id: 'item08',
        label: 'Meme 08',
        name: 'Hádka s pastorem',
        description: 'Co si budem, není to nejlepší nápad.',
        image: 'items/item08.mp4'
    },
    {
        id: 'item09',
        label: 'Meme 09',
        name: 'Párty s Duchem',
        caption: 'POV: Párty s Duchem',
        description: 'Kam se hrabou maturáky!',
        image: 'items/item09.mov'
    },
    {
        id: 'item10',
        label: 'Meme 10',
        name: 'Rickroll',
        caption: 'Klasika...',
        description: 'Ha, nachtal ses! Ale reálně: "HE is never gonna give you up!"',
        image: 'items/item10.mp4'
    }
];

const LOCAL_STORAGE_PLAYER_KEY = 'playerId';
const ITEM_IDS = TOTAL_ITEMS.map((item) => item.id);
const ICON_LOCKED_PATH = 'icons/lock_24dp_1F1F1F_FILL0_wght400_GRAD0_opsz24.svg';
const ICON_UNLOCKED_PATH = 'icons/lock_open_right_24dp_1F1F1F_FILL0_wght400_GRAD0_opsz24.svg';

const params = new URLSearchParams(window.location.search);
const isAdminMode = params.get('admin') === 'true';
let pendingItemId = sanitizeItemId(params.get('item'));
let pendingImageParam = sanitizeImageParam(params.get('image'));

const elements = {
    adminCount: document.getElementById('admin-count'),
    adminScreen: document.getElementById('admin-screen'),
    completionSummary: document.getElementById('completion-summary'),
    rewardMessage: document.getElementById('reward-message'),
    congratulationsScreen: document.getElementById('congratulations-screen'),
    dashboardScreen: document.getElementById('dashboard-screen'),
    itemsGrid: document.getElementById('items-grid'),
    leaderboardBody: document.getElementById('leaderboard-body'),
    messageModal: document.getElementById('message-modal'),
    messageModalClose: document.getElementById('message-modal-close'),
    messageModalPanel: document.getElementById('message-modal-panel'),
    messageModalText: document.getElementById('message-modal-text'),
    messageModalTitle: document.getElementById('message-modal-title'),
    playerChip: document.getElementById('player-chip'),
    playerNameInput: document.getElementById('player-name'),
    progressCounter: document.getElementById('progress-counter'),
    scanContinueButton: document.getElementById('scan-continue-button'),
    scanResultCaption: document.getElementById('scan-result-caption'),
    scanResultImage: document.getElementById('scan-result-image'),
    scanResultImageNote: document.getElementById('scan-result-image-note'),
    scanResultScreen: document.getElementById('scan-result-screen'),
    scanResultTitle: document.getElementById('scan-result-title'),
    scanResultVideo: document.getElementById('scan-result-video'),
    simulateLastItemButton: document.getElementById('simulate-last-item-button'),
    simulateAllItemsButton: document.getElementById('simulate-all-items-button'),
    clearStorageButton: document.getElementById('clear-storage-button'),
    startButton: document.getElementById('start-button'),
    startForm: document.getElementById('start-form'),
    startedAt: document.getElementById('started-at'),
    statusText: document.getElementById('status-text'),
    template: document.getElementById('item-card-template'),
    understandButton: document.getElementById('understand-button'),
    welcomeScreen: document.getElementById('welcome-screen')
};

let db;
let playerId = localStorage.getItem(LOCAL_STORAGE_PLAYER_KEY);
let playerUnsubscribe = null;
let adminUnsubscribe = null;
let isStartingPlayer = false;
let isProcessingItem = false;
let finishUpdateRequested = false;
let isViewingScanResult = false;
let latestPlayer = null;
let finalRankingText = null;
let isLoadingFinalRanking = false;

bootstrap();

function bootstrap() {
    bindEvents();

    // Check if user has already understood how it works
    if (localStorage.getItem('user-understood-how-it-works') === 'true') {
        // Move the panel to sidebar immediately
        setTimeout(() => moveHowItWorksToSidebar(), 100);
    }

    try {
        const app = initializeApp(firebaseConfig);
        db = getFirestore(app);
    } catch (error) {
        console.error(error);
        showMessage('Doplň Firebase konfiguraci v app.js před spuštěním aplikace.', 'error');
        showScreen('welcome');
        disableStartForm();
        return;
    }

    if (isAdminMode) {
        showScreen('admin');
        subscribeToLeaderboard();
        return;
    }

    if (!playerId) {
        showScreen('welcome');
        // Removed notification for first scanned QR code
        // if (pendingItemId) {
        //     showMessage('Po vytvoření hráče se právě naskenovaný QR kód automaticky přidá do sbírky.', 'success');
        // }
        return;
    }

    showScreen('dashboard');
    subscribeToPlayer(playerId);
}

function bindEvents() {
    elements.startForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        if (isStartingPlayer) {
            return;
        }

        const name = elements.playerNameInput.value.trim().replace(/\s+/g, ' ');
        if (!name) {
            showMessage('Před startem vyplň hráčské jméno.', 'error');
            return;
        }

        isStartingPlayer = true;
        elements.startButton.disabled = true;

        try {
            const playersCollection = collection(db, 'players');

            const existingPlayersSnapshot = await getDocs(playersCollection);
            const requestedName = normalizePlayerNickname(name);
            const isNameTaken = existingPlayersSnapshot.docs.some((playerDoc) => {
                const existingName = playerDoc.data().name;
                return normalizePlayerNickname(existingName) === requestedName;
            });

            if (isNameTaken) {
                showMessage('Tato hráčská přezdívka už je obsazená. Zvol prosím jinou.', 'error');
                return;
            }

            const playerRef = await addDoc(playersCollection, {
                name,
                collectedItems: [],
                startTime: serverTimestamp(),
                finishTime: null
            });

            playerId = playerRef.id;
            finalRankingText = null;
            localStorage.setItem(LOCAL_STORAGE_PLAYER_KEY, playerId);
            showMessage(`Vítej, ${name}. Výborně! Právě jsi našel svůj první meme. Jen tak dál! Až si meme prohlédneš můžeš aplikaci klidně zavřít. Otevře se automaticky znovu při naskenování dalšího kódu.`, 'success');
            showScreen('dashboard');
            subscribeToPlayer(playerId);
        } catch (error) {
            console.error(error);
            showMessage('Nepodařilo se vytvořit hráčský záznam. Zkontroluj Firebase nastavení a pravidla Firestore.', 'error');
        } finally {
            isStartingPlayer = false;
            elements.startButton.disabled = false;
        }
    });

    elements.messageModalClose.addEventListener('click', hideMessageModal);
    elements.messageModal.addEventListener('click', (event) => {
        if (event.target === elements.messageModal) {
            hideMessageModal();
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && !elements.messageModal.classList.contains('hidden')) {
            hideMessageModal();
        }
    });

    elements.scanContinueButton.addEventListener('click', () => {
        isViewingScanResult = false;
        cleanScanResultView();
        cleanItemParameterFromUrl();

        if (latestPlayer) {
            renderPlayerDashboard(latestPlayer);
        } else {
            showScreen('dashboard');
        }
    });

    elements.understandButton.addEventListener('click', () => {
        // Save that user understood how it works
        localStorage.setItem('user-understood-how-it-works', 'true');
        moveHowItWorksToSidebar();
    });

    elements.simulateLastItemButton.addEventListener('click', async () => {
        if (!playerId || !latestPlayer) {
            showMessage('Nejprve založ hráče na úvodní obrazovce.', 'error');
            return;
        }

        const lastItem = TOTAL_ITEMS[TOTAL_ITEMS.length - 1];
        if (!lastItem) {
            showMessage('Poslední položka nebyla nalezena.', 'error');
            return;
        }

        pendingItemId = lastItem.id;
        pendingImageParam = lastItem.image || null;
        await collectPendingItem(playerId, latestPlayer.collectedItems);
    });

    elements.simulateAllItemsButton.addEventListener('click', async () => {
        if (!playerId || !latestPlayer) {
            showMessage('Nejprve založ hráče na úvodní obrazovce.', 'error');
            return;
        }

        try {
            const playerRef = doc(db, 'players', playerId);
            await updateDoc(playerRef, {
                collectedItems: ITEM_IDS,
                finishTime: serverTimestamp()
            });

            finalRankingText = null;
            showMessage('Byla simulovaná kompletní sbírka. Gratulace!', 'success');
        } catch (error) {
            console.error(error);
            showMessage('Simulace všech memů selhala.', 'error');
        }
    });

    elements.clearStorageButton.addEventListener('click', () => {
        const confirmed = window.confirm('Opravdu chceš vymazat všechna data z localStorage? Aplikace se restartuje.');
        if (confirmed) {
            localStorage.clear();
            location.reload();
        }
    });
}

function moveHowItWorksToSidebar() {
    const howItWorksSection = document.getElementById('how-it-works-section');
    const sidebar = document.querySelector('#dashboard-screen aside');

    if (howItWorksSection && sidebar) {
        // Remove the button since it's no longer needed
        const understandButton = howItWorksSection.querySelector('#understand-button');
        if (understandButton) {
            understandButton.remove();
        }

        // Move the section to the sidebar
        sidebar.insertBefore(howItWorksSection, sidebar.firstChild);
    }
}

function subscribeToPlayer(currentPlayerId) {
    if (playerUnsubscribe) {
        playerUnsubscribe();
    }

    const playerRef = doc(db, 'players', currentPlayerId);
    playerUnsubscribe = onSnapshot(
        playerRef,
        async (snapshot) => {
            if (!snapshot.exists()) {
                localStorage.removeItem(LOCAL_STORAGE_PLAYER_KEY);
                playerId = null;
                showMessage('Uložený hráčský záznam už neexistuje. Spusť novou hru.', 'error');
                showScreen('welcome');
                return;
            }

            const player = normalizePlayer(snapshot.id, snapshot.data());
            renderPlayerDashboard(player);

            if (pendingItemId) {
                await collectPendingItem(player.id, player.collectedItems);
            }

            if (player.collectedItems.length === ITEM_IDS.length && !player.finishTime && !finishUpdateRequested) {
                finishUpdateRequested = true;
                try {
                    await updateDoc(playerRef, { finishTime: serverTimestamp() });
                } catch (error) {
                    console.error(error);
                    finishUpdateRequested = false;
                    showMessage('Nepodařilo se uložit čas dokončení.', 'error');
                }
            }
        },
        (error) => {
            console.error(error);
            showMessage('Synchronizace hráče v reálném čase selhala. Zkontroluj oprávnění ve Firestore.', 'error');
        }
    );
}

async function collectPendingItem(currentPlayerId, collectedItemsBeforeUpdate = []) {
    if (!pendingItemId || isProcessingItem) {
        return;
    }

    isProcessingItem = true;
    const collectedItem = pendingItemId;

    try {
        const hasItemAlready = Array.isArray(collectedItemsBeforeUpdate)
            ? collectedItemsBeforeUpdate.includes(collectedItem)
            : false;

        if (hasItemAlready) {
            pendingItemId = null;
            pendingImageParam = null;
            cleanItemParameterFromUrl();
            showMessage(`Meme ${collectedItem} už máš v kolekci.`, 'error');
            return;
        }

        const playerRef = doc(db, 'players', currentPlayerId);
        await updateDoc(playerRef, {
            collectedItems: arrayUnion(collectedItem)
        });

        const item = TOTAL_ITEMS.find((entry) => entry.id === collectedItem) || null;
        const imageSrc = pendingImageParam || (item ? item.image : null);
        showScanResult(item, imageSrc);

        pendingItemId = null;
        pendingImageParam = null;
    } catch (error) {
        console.error(error);
        showMessage('Nepodařilo se uložit naskenovaný QR kód.', 'error');
    } finally {
        isProcessingItem = false;
    }
}

function renderPlayerDashboard(player) {
    latestPlayer = player;
    const foundCount = player.collectedItems.length;
    const hasCompleted = foundCount === ITEM_IDS.length;

    elements.playerChip.textContent = player.name;
    elements.playerChip.classList.remove('hidden');
    elements.progressCounter.textContent = `${foundCount} / ${ITEM_IDS.length} nalezených`;
    if (hasCompleted) {
        if (finalRankingText) {
            elements.completionSummary.textContent = finalRankingText;
        } else {
            elements.completionSummary.textContent = 'Zjišťuji konečné pořadí...';
            elements.rewardMessage.classList.add('hidden');
            void loadFinalRanking(player.id);
        }
    } else {
        finalRankingText = null;
        elements.completionSummary.textContent = `${foundCount} / ${ITEM_IDS.length} nalezených`;
        elements.rewardMessage.classList.add('hidden');
    }
    elements.startedAt.textContent = formatTimestamp(player.startTime);
    elements.statusText.textContent = hasCompleted ? 'Dokončeno' : 'Prozkoumávání v plném proudu';

    renderItems(player.collectedItems);

    if (hasCompleted && !isViewingScanResult) {
        elements.congratulationsScreen.classList.remove('hidden');
    } else {
        elements.congratulationsScreen.classList.add('hidden');
    }

    if (!isViewingScanResult) {
        showScreen('dashboard');
    }
}

function renderItems(collectedItems) {
    elements.itemsGrid.innerHTML = '';

    TOTAL_ITEMS.forEach((item) => {
        const node = elements.template.content.firstElementChild.cloneNode(true);
        const isCollected = collectedItems.includes(item.id);

        const label = node.querySelector('.item-label');
        const name = node.querySelector('.item-name');
        const icon = node.querySelector('.item-icon');
        const description = node.querySelector('.item-description');
        const reviewButton = node.querySelector('.item-review-button');

        label.textContent = item.label;
        name.textContent = isCollected ? item.name : '?';
        description.textContent = isCollected ? item.description : 'Uzamčeno do naskenování QR kódu na tomto checkpointu.';

        if (isCollected) {
            node.className = 'rounded-[1.75rem] border border-emerald-200 bg-emerald-50 p-5 transition';
            label.className = 'item-label text-xs font-semibold uppercase tracking-[0.25em] text-emerald-700';
            name.className = 'item-name mt-3 text-2xl font-black text-slate-900';
            icon.className = 'item-icon inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500';
            icon.innerHTML = `<img src="${ICON_UNLOCKED_PATH}" alt="Odemčeno" class="h-6 w-6 invert">`;
            description.className = 'item-description mt-5 text-sm leading-6 text-slate-700';

            if (reviewButton) {
                reviewButton.classList.remove('hidden');
                reviewButton.addEventListener('click', () => {
                    showScanResult(item, item.image);
                });
            }
        } else {
            node.className = 'rounded-[1.75rem] border border-slate-200 bg-slate-100/80 p-5 opacity-70 grayscale transition';
            label.className = 'item-label text-xs font-semibold uppercase tracking-[0.25em] text-slate-500';
            name.className = 'item-name mt-3 text-2xl font-black text-slate-600';
            icon.className = 'item-icon inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-300';
            icon.innerHTML = `<img src="${ICON_LOCKED_PATH}" alt="Zamčeno" class="h-6 w-6">`;
            description.className = 'item-description mt-5 text-sm leading-6 text-slate-500';

            if (reviewButton) {
                reviewButton.classList.add('hidden');
            }
        }

        elements.itemsGrid.appendChild(node);
    });
}

function subscribeToLeaderboard() {
    if (adminUnsubscribe) {
        adminUnsubscribe();
    }

    const playersQuery = query(collection(db, 'players'));
    adminUnsubscribe = onSnapshot(
        playersQuery,
        (snapshot) => {
            const players = snapshot.docs.map((playerDoc) => normalizePlayer(playerDoc.id, playerDoc.data()));
            renderLeaderboard(players);
        },
        (error) => {
            console.error(error);
            showMessage('Nepodařilo se načíst admin žebříček.', 'error');
        }
    );
}

function renderLeaderboard(players) {
    const sortedPlayers = sortPlayersForLeaderboard(players);

    elements.adminCount.textContent = `${sortedPlayers.length} hráč${sortedPlayers.length === 1 ? '' : 'ů'}`;
    elements.leaderboardBody.innerHTML = '';

    if (sortedPlayers.length === 0) {
        const emptyRow = document.createElement('tr');
        emptyRow.innerHTML = '<td colspan="7" class="px-4 py-6 text-center text-slate-500">Zatím žádní hráči.</td>';
        elements.leaderboardBody.appendChild(emptyRow);
        return;
    }

    sortedPlayers.forEach((player) => {
        const row = document.createElement('tr');
        const completed = Boolean(player.finishTime);
        row.innerHTML = `
      <td class="px-4 py-4 font-semibold text-slate-900">${escapeHtml(player.name)}</td>
      <td class="px-4 py-4">${player.collectedItems.length} / ${ITEM_IDS.length}</td>
      <td class="px-4 py-4">${formatTimestamp(player.startTime)}</td>
      <td class="px-4 py-4">${formatTimestamp(player.finishTime)}</td>
      <td class="px-4 py-4">${formatDuration(getElapsedTime(player.startTime, player.finishTime))}</td>
      <td class="px-4 py-4">${completed ? 'Dokončeno' : 'Probíhá'}</td>
      <td class="px-4 py-4">
        <button
          type="button"
          class="inline-flex items-center justify-center rounded-xl bg-rose-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-rose-700 focus:outline-none focus:ring-4 focus:ring-rose-200"
          data-delete-player-id="${player.id}"
          data-delete-player-name="${escapeHtml(player.name)}"
        >
          Smazat
        </button>
      </td>
    `;
        elements.leaderboardBody.appendChild(row);
    });

    const deleteButtons = elements.leaderboardBody.querySelectorAll('[data-delete-player-id]');
    deleteButtons.forEach((button) => {
        button.addEventListener('click', async () => {
            const playerIdToDelete = button.getAttribute('data-delete-player-id');
            const playerNameToDelete = button.getAttribute('data-delete-player-name') || 'Neznámý hráč';

            if (!playerIdToDelete) {
                return;
            }

            const confirmed = window.confirm(`Opravdu chceš smazat hráče \"${playerNameToDelete}\"?`);
            if (!confirmed) {
                return;
            }

            button.disabled = true;
            try {
                await deleteDoc(doc(db, 'players', playerIdToDelete));
                showMessage(`Hráč ${playerNameToDelete} byl smazán.`, 'success');
            } catch (error) {
                console.error(error);
                button.disabled = false;
                showMessage('Hráče se nepodařilo smazat.', 'error');
            }
        });
    });
}

function normalizePlayer(id, data) {
    return {
        id,
        name: data.name || 'Neznámý hráč',
        collectedItems: Array.isArray(data.collectedItems)
            ? data.collectedItems.filter((itemId) => ITEM_IDS.includes(itemId))
            : [],
        startTime: data.startTime || null,
        finishTime: data.finishTime || null
    };
}

function showScreen(screen) {
    const visible = {
        admin: screen === 'admin',
        dashboard: screen === 'dashboard',
        scanResult: screen === 'scanResult',
        welcome: screen === 'welcome'
    };

    elements.adminScreen.classList.toggle('hidden', !visible.admin);
    elements.dashboardScreen.classList.toggle('hidden', !visible.dashboard);
    elements.scanResultScreen.classList.toggle('hidden', !visible.scanResult);
    elements.welcomeScreen.classList.toggle('hidden', !visible.welcome);

    if (visible.admin) {
        elements.playerChip.classList.add('hidden');
        elements.congratulationsScreen.classList.add('hidden');
    }

    if (visible.welcome) {
        elements.playerChip.classList.add('hidden');
        elements.congratulationsScreen.classList.add('hidden');
    }
}

function showScanResult(item, imageSrc) {
    isViewingScanResult = true;
    elements.scanResultTitle.textContent = item
        ? `Objevil jsi: ${item.name}`
        : 'Objevil jsi novou položku';

    if (item?.caption) {
        elements.scanResultCaption.textContent = item.caption;
        elements.scanResultCaption.classList.remove('hidden');
    } else {
        elements.scanResultCaption.textContent = '';
        elements.scanResultCaption.classList.add('hidden');
    }

    const isVideo = typeof imageSrc === 'string' && /\.(mp4|mov)(\?.*)?$/i.test(imageSrc);

    if (imageSrc) {
        if (isVideo) {
            elements.scanResultVideo.src = imageSrc;
            elements.scanResultVideo.classList.remove('hidden');
            elements.scanResultImage.classList.add('hidden');
            elements.scanResultVideo.currentTime = 0;
            elements.scanResultVideo.play().catch(() => { });
        } else {
            elements.scanResultImage.src = imageSrc;
            elements.scanResultImage.classList.remove('hidden');
            elements.scanResultVideo.classList.add('hidden');
            elements.scanResultVideo.pause();
            elements.scanResultVideo.currentTime = 0;
            elements.scanResultVideo.removeAttribute('src');
        }
        elements.scanResultImageNote.classList.add('hidden');
    } else {
        elements.scanResultImage.removeAttribute('src');
        elements.scanResultImage.classList.add('hidden');
        elements.scanResultVideo.classList.add('hidden');
        elements.scanResultVideo.removeAttribute('src');
        elements.scanResultImageNote.classList.remove('hidden');
    }

    showScreen('scanResult');
}

function cleanScanResultView() {
    elements.scanResultCaption.textContent = '';
    elements.scanResultCaption.classList.add('hidden');
    elements.scanResultImage.removeAttribute('src');
    elements.scanResultImage.classList.remove('hidden');
    elements.scanResultVideo.pause();
    elements.scanResultVideo.currentTime = 0;
    elements.scanResultVideo.classList.add('hidden');
    elements.scanResultVideo.removeAttribute('src');
    elements.scanResultImageNote.classList.add('hidden');
}

function showMessage(message, type) {
    elements.messageModalText.textContent = message;
    elements.messageModalPanel.className = 'w-full max-w-md rounded-3xl border bg-white p-6 shadow-panel';
    if (type === 'error') {
        elements.messageModalTitle.textContent = 'Upozornění';
        elements.messageModalTitle.className = 'text-sm font-semibold uppercase tracking-[0.2em] text-sky-700';
        elements.messageModalPanel.classList.add('border-sky-200');
        elements.messageModalClose.className = 'mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-700 focus:outline-none focus:ring-4 focus:ring-sky-200';
    } else {
        elements.messageModalTitle.textContent = 'Hotovo';
        elements.messageModalTitle.className = 'text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700';
        elements.messageModalPanel.classList.add('border-emerald-200');
        elements.messageModalClose.className = 'mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-200';
    }

    elements.messageModal.classList.remove('hidden');
    elements.messageModal.classList.add('flex');
}

function hideMessageModal() {
    elements.messageModal.classList.add('hidden');
    elements.messageModal.classList.remove('flex');
}

function disableStartForm() {
    elements.playerNameInput.disabled = true;
    elements.startButton.disabled = true;
}

function cleanItemParameterFromUrl() {
    const cleanUrl = new URL(window.location.href);
    cleanUrl.searchParams.delete('item');
    cleanUrl.searchParams.delete('image');
    const relativeUrl = `${cleanUrl.pathname}${cleanUrl.search}${cleanUrl.hash}`;
    window.history.replaceState({}, document.title, relativeUrl);
}

function sanitizeItemId(rawItemId) {
    if (!rawItemId) {
        return null;
    }

    const normalizedItemId = String(rawItemId).trim().toLowerCase();
    if (ITEM_IDS.includes(normalizedItemId)) {
        return normalizedItemId;
    }

    const simpleMatch = normalizedItemId.match(/^item(\d+)$/);
    if (simpleMatch) {
        const paddedVariant = `item${simpleMatch[1].padStart(2, '0')}`;
        if (ITEM_IDS.includes(paddedVariant)) {
            return paddedVariant;
        }
    }

    const paddedMatch = normalizedItemId.match(/^item0+(\d+)$/);
    if (paddedMatch) {
        const compactVariant = `item${Number(paddedMatch[1])}`;
        if (ITEM_IDS.includes(compactVariant)) {
            return compactVariant;
        }
    }

    return null;
}

function sanitizeImageParam(rawImage) {
    if (!rawImage) {
        return null;
    }

    try {
        const imageUrl = new URL(rawImage, window.location.origin);
        const isSameOriginPath = imageUrl.origin === window.location.origin;
        const isHttpUrl = imageUrl.protocol === 'http:' || imageUrl.protocol === 'https:';

        if (!isHttpUrl) {
            return null;
        }

        return isSameOriginPath
            ? `${imageUrl.pathname}${imageUrl.search}${imageUrl.hash}`
            : imageUrl.href;
    } catch (error) {
        return null;
    }
}

function normalizePlayerNickname(name) {
    if (typeof name !== 'string') {
        return '';
    }

    return name
        .trim()
        .replace(/\s+/g, ' ')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
}

function formatTimestamp(timestamp) {
    if (!timestamp || typeof timestamp.toDate !== 'function') {
        return '-';
    }

    return new Intl.DateTimeFormat('cs-CZ', {
        dateStyle: 'short',
        timeStyle: 'medium'
    }).format(timestamp.toDate());
}

function getElapsedTime(startTime, finishTime) {
    if (!startTime || typeof startTime.toMillis !== 'function') {
        return Number.POSITIVE_INFINITY;
    }

    if (!finishTime || typeof finishTime.toMillis !== 'function') {
        return Number.POSITIVE_INFINITY;
    }

    return Math.max(0, finishTime.toMillis() - startTime.toMillis());
}

function formatDuration(duration) {
    if (!Number.isFinite(duration)) {
        return '-';
    }

    const totalSeconds = Math.floor(duration / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':');
}

function escapeHtml(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

async function loadFinalRanking(currentPlayerId) {
    if (isLoadingFinalRanking || finalRankingText) {
        return;
    }

    isLoadingFinalRanking = true;
    try {
        const snapshot = await getDocs(collection(db, 'players'));
        const finishedCount = snapshot.docs.filter((playerDoc) => {
            const finishTime = playerDoc.data().finishTime;
            return finishTime !== null && finishTime !== undefined;
        }).length;

        finalRankingText = `${finishedCount}. místo`;
        elements.completionSummary.textContent = finalRankingText;

        if (finishedCount <= 3) {
            elements.rewardMessage.classList.remove('hidden');
        } else {
            elements.rewardMessage.classList.add('hidden');
        }
    } catch (error) {
        console.error(error);
        elements.completionSummary.textContent = 'Pořadí se nepodařilo načíst.';
        elements.rewardMessage.classList.add('hidden');
    } finally {
        isLoadingFinalRanking = false;
    }
}

function sortPlayersForLeaderboard(players) {
    return [...players].sort((left, right) => {
        const leftFinished = Boolean(left.finishTime && typeof left.finishTime.toMillis === 'function');
        const rightFinished = Boolean(right.finishTime && typeof right.finishTime.toMillis === 'function');

        if (leftFinished && rightFinished) {
            const finishDifference = left.finishTime.toMillis() - right.finishTime.toMillis();
            if (finishDifference !== 0) {
                return finishDifference;
            }
        }

        if (leftFinished !== rightFinished) {
            return leftFinished ? -1 : 1;
        }

        const countDifference = right.collectedItems.length - left.collectedItems.length;
        if (countDifference !== 0) {
            return countDifference;
        }

        return String(left.name).localeCompare(String(right.name), 'cs');
    });
}