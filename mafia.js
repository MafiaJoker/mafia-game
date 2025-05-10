// Добавим переменную для отслеживания видимости ролей
let rolesVisible = false;

// Game data
const gameState = {
    round: 0,
    phase: 'distribution', // distribution, day, voting, night
    isGameStarted: false,
    players: [],
    nominatedPlayers: [],
    votingResults: {},
    shootoutPlayers: [],
    deadPlayers: [],
    eliminatedPlayers: [],
    nightKill: null,
    bestMoveUsed: false,
    noCandidatesRounds: 0,
    mafiaTarget: null,
    donTarget: null,
    sheriffTarget: null,
    bestMoveTargets: new Set()
};

// Timer
let timerInterval;
let timerSeconds = 0;

// Initialize the game
function initGame() {
    // Create 10 players
    for (let i = 1; i <= 10; i++) {
        gameState.players.push({
            id: i,
            name: `Игрок ${i}`,
            role: 'Мирный',
            originalRole: 'Мирный',
            fouls: 0,
            nominated: null,
            isAlive: true,
            isEliminated: false,
            isSilent: false,
            silentNextRound: false
        });
    }
    
    renderPlayers();
    setupEventListeners();
}

function getRole(role) {
    if (role === 'Мирный') { return `<input class="role-img" type="image" src="resources/citezen.svg" />` }
    if (role === 'Шериф')  { return `<input class="role-img" type="image" src="resources/sheriff.svg" />` }
    if (role === 'Мафия')  { return `<input class="role-img" type="image" src="resources/pistol.svg" />` }
    if (role === 'Дон')    { return `<input class="role-img" type="image" src="resources/don.svg" />` }

}

// Render players
function renderPlayers() {
    const playersList = document.getElementById('playersList');
    playersList.innerHTML = '';
    
    gameState.players.forEach((player) => {
        if (player.isEliminated) return;
        
        const rowClass = player.isSilent ? 'bg-danger text-white' : (player.isAlive ? '' : 'bg-secondary text-white');
        const playerEl = document.createElement('div');
        playerEl.className = `row mb-2 align-items-center ${rowClass}`;
        
        // Number
        const numberEl = document.createElement('div');
        numberEl.className = 'col-1 text-center';
        numberEl.textContent = player.id;
        playerEl.appendChild(numberEl);
        
        // Fouls
        const foulsEl = document.createElement('div');
        foulsEl.className = 'col-1';
        
        const foulsContainer = document.createElement('div');
        foulsContainer.className = 'd-flex align-items-center justify-content-center';
        
        
        // Только если игра началась, показываем кнопки фолов
        if (gameState.isGameStarted) {
            const foulsButtons = document.createElement('div');
            foulsButtons.className = 'd-flex flex-column';
            
            const incFoulBtn = document.createElement('button');
            incFoulBtn.className = 'btn btn-sm btn-link text-secondary p-0 ms-2';
            incFoulBtn.innerHTML = '<i class="bi bi-arrow-right"></i>';
            incFoulBtn.onclick = () => incrementFoul(player.id);

            const foulsCount = document.createElement('span');
            foulsCount.className = 'mx-1';
            foulsCount.textContent = player.fouls;

            const decFoulBtn = document.createElement('button');
            decFoulBtn.className = 'btn btn-sm btn-link text-secondary p-0 me-2';
            decFoulBtn.innerHTML = '<i class="bi bi-arrow-left"></i>';
            decFoulBtn.onclick = () => decrementFoul(player.id);
            
            // foulsContainer.appendChild(decFoulBtn);
            foulsContainer.appendChild(foulsCount);
            // foulsContainer.appendChild(incFoulBtn);
        }
        
        foulsEl.appendChild(foulsContainer);
        playerEl.appendChild(foulsEl);
        
        // Role
        const roleEl = document.createElement('div');
	const roleBtn1 = document.querySelector('.row.mb-2.fw-bold .col-2.text-center');
        roleEl.className = 'col-2 text-center';
        
        if (gameState.phase === 'distribution') {
            const roleBtn = document.createElement('button');
            roleBtn.className = 'btn btn-sm btn-outline-primary role-btn';
            roleBtn.innerHTML = getRole(player.role);
            roleBtn.onclick = () => changeRole(player.id);
            roleEl.appendChild(roleBtn);
        } else {
            // Показываем роли только если они видимы или игра не началась
            roleEl.innerHTML = (rolesVisible || !gameState.isGameStarted) ? getRole(player.role) : '';
	    roleBtn1.innerHTML = (rolesVisible || !gameState.isGameStarted) ? '<a href="#"> <b>Роль</b> </a>' : '<a href="#">Роль</a>';
        }
        
        playerEl.appendChild(roleEl);
        
        // Name
        const nameEl = document.createElement('div');
        nameEl.className = 'col-3';
        nameEl.textContent = player.name;
        playerEl.appendChild(nameEl);
        
        // Nomination
        const nominationEl = document.createElement('div');
        nominationEl.className = 'col-2';
        
        if (player.isAlive && gameState.phase === 'day') {
            const selectEl = document.createElement('select');
            selectEl.className = 'form-select';
            selectEl.onchange = (e) => nominatePlayer(player.id, parseInt(e.target.value));
            
            const emptyOption = document.createElement('option');
            emptyOption.value = '';
            emptyOption.textContent = '';
            selectEl.appendChild(emptyOption);
            
            // Получаем список уже выставленных игроков
            const nominatedPlayerIds = gameState.players
                .filter(p => p.isAlive && !p.isEliminated && p.nominated !== null)
                .map(p => p.nominated);
            
            gameState.players.forEach(p => {
                // Показываем только живых, не удаленных и не выставленных другими игроков
                // Или если это текущий выставленный игрок
                if ((p.isAlive && !p.isEliminated && 
                    (!nominatedPlayerIds.includes(p.id) || p.id === player.nominated)) || 
                    p.id === player.id) {
                    const option = document.createElement('option');
                    option.value = p.id;
                    option.textContent = `${p.id}`;
                    if (player.nominated === p.id) {
                        option.selected = true;
                    }
                    selectEl.appendChild(option);
                }
            });
            
            nominationEl.appendChild(selectEl);
        } else {
            if (player.nominated) {
                const nominatedPlayer = gameState.players.find(p => p.id === player.nominated);
                nominationEl.textContent = `${nominatedPlayer.id}: ${nominatedPlayer.name}`;
            } else {
                nominationEl.textContent = '';
            }
        }
        
        playerEl.appendChild(nominationEl);
        
        // Special actions for fouls
        if (player.fouls === 3 && !(player.isSilent || player.silentNextRound)) {
            const actionsEl = document.createElement('div');
            actionsEl.className = 'col-12 mt-1';
            
            const silentNowBtn = document.createElement('button');
            silentNowBtn.className = 'btn btn-sm btn-danger me-2';
            silentNowBtn.innerHTML = '<i class="bi bi-arrow-down"></i> Молчит на этом кругу';
            silentNowBtn.onclick = () => setSilentNow(player.id);
            
            const silentNextBtn = document.createElement('button');
            silentNextBtn.className = 'btnx btn-secondary';
            silentNextBtn.innerHTML = '<i class="bi bi-arrow-right"></i> Молчит на следующем кругу';
            silentNextBtn.onclick = () => setSilentNextRound(player.id);
            
            actionsEl.appendChild(silentNowBtn);
            actionsEl.appendChild(silentNextBtn);
            playerEl.appendChild(actionsEl);
        }
        
        if (player.fouls >= 4 && !player.isEliminated) {
            const actionsEl = document.createElement('div');
            actionsEl.className = 'col-12 mt-1';
                        
            const eliminateBtn = document.createElement('button');
            eliminateBtn.className = 'btn btn-danger';
            eliminateBtn.innerHTML = '<i class="bi bi-exclamation-triangle"></i> Удалить игрока';
            eliminateBtn.onclick = () => eliminatePlayer(player.id);
            
            // actionsEl.appendChild(revertFoulBtn);
            actionsEl.appendChild(eliminateBtn);
            playerEl.appendChild(actionsEl);
        }
	if (player.fouls >= 5) { decrementFoul(player.id)}
        
        playersList.appendChild(playerEl);
    });
}

// Change player role
function changeRole(playerId) {
    if (gameState.phase !== 'distribution') return;
    
    const player = gameState.players.find(p => p.id === playerId);
    const mafiaCount = gameState.players.filter(p => p.role === 'Мафия').length;
    const donCount = gameState.players.filter(p => p.role === 'Дон').length;
    const sheriffCount = gameState.players.filter(p => p.role === 'Шериф').length;
    
    if (player.role === 'Мирный') {
        if (mafiaCount < 2) {
            player.role = 'Мафия';
        } else if (donCount < 1) {
            player.role = 'Дон';
        } else if (sheriffCount < 1) {
            player.role = 'Шериф';
        }
    } else if (player.role === 'Мафия') {
        if (donCount < 1) {
            player.role = 'Дон';
        } else if (sheriffCount < 1) {
            player.role = 'Шериф';
        } else {
            player.role = 'Мирный';
        }
    } else if (player.role === 'Дон') {
        if (sheriffCount < 1) {
            player.role = 'Шериф';
        } else {
            player.role = 'Мирный';
        }
    } else if (player.role === 'Шериф') {
        player.role = 'Мирный';
    }
    
    player.originalRole = player.role;
    renderPlayers();
    
    // Check if we can start the game
    const canStart = gameState.players.filter(p => p.role === 'Мафия').length === 2 &&
          gameState.players.filter(p => p.role === 'Дон').length === 1 &&
          gameState.players.filter(p => p.role === 'Шериф').length === 1;
    
    document.getElementById('startGame').classList.toggle('d-none', !canStart);
}

// Increment foul
function incrementFoul(playerId) {
    const player = gameState.players.find(p => p.id === playerId);
    player.fouls++;
    renderPlayers();
}

// Decrement foul
function decrementFoul(playerId) {
    const player = gameState.players.find(p => p.id === playerId);
    if (player.fouls > 0) {
        player.fouls--;
    }
    renderPlayers();
}

// Revert foul to 3
function revertFoul(playerId) {
    const player = gameState.players.find(p => p.id === playerId);
    player.fouls = 3;
    renderPlayers();
}

// Set player silent for current round
function setSilentNow(playerId) {
    const player = gameState.players.find(p => p.id === playerId);
    player.isSilent = true;      
    renderPlayers();
}

// Set player silent for next round
function setSilentNextRound(playerId) {
    const player = gameState.players.find(p => p.id === playerId);
    player.silentNextRound = true;      
    renderPlayers();
}

function eliminatePlayer(playerId) {
    const player = gameState.players.find(p => p.id === playerId);
    player.isEliminated = true;
    player.isAlive = false;
    gameState.eliminatedPlayers.push(playerId);
    
    // Reset all nominations for this player
    gameState.players.forEach(p => {
        if (p.nominated === playerId) {
            p.nominated = null;
        }
    });
    
    renderPlayers();
    checkGameEnd();
}

// Nominate player
function nominatePlayer(nominatorId, nominatedId) {
    const nominator = gameState.players.find(p => p.id === nominatorId);
    
    if (nominatedId) {
        nominator.nominated = nominatedId;
    } else {
        nominator.nominated = null;
    }
    
    updateNominatedPlayers();
    renderPlayers();
}

// Update the list of nominated players
function updateNominatedPlayers() {
    gameState.nominatedPlayers = [];
    const nominations = gameState.players
          .filter(p => p.isAlive && !p.isEliminated && p.nominated !== null)
          .map(p => p.nominated);
    
    const uniqueNominations = [...new Set(nominations)];
    
    uniqueNominations.forEach(id => {
        const player = gameState.players.find(p => p.id === id);
        if (player.isAlive && !player.isEliminated) {
            gameState.nominatedPlayers.push(id);
        }
    });
    
    // Show "Start Voting" button if there are nominations
    const startVotingBtn = document.getElementById('startVoting');
    const goToNightBtn = document.getElementById('goToNight');
    
    if (gameState.phase === 'day') {
        const playersCount = gameState.players.filter(p => p.isAlive && !p.isEliminated).length;
        
        // Проверяем условия для голосования
        if (gameState.round === 0 && playersCount === 10) {
            // Первый день (нулевой круг) - требуется минимум 2 кандидатуры при 10 игроках
            if (gameState.nominatedPlayers.length >= 2) {
                startVotingBtn.classList.remove('d-none');
                goToNightBtn.classList.add('d-none');
            } else {
                startVotingBtn.classList.add('d-none');
                goToNightBtn.classList.remove('d-none');
            }
        } else if (gameState.nominatedPlayers.length >= 1) {
            // Для всех остальных случаев - требуется минимум 1 кандидатура
            startVotingBtn.classList.remove('d-none');
            goToNightBtn.classList.add('d-none');
        } else {
            // Нет кандидатур - идем в ночь
            startVotingBtn.classList.add('d-none');
            goToNightBtn.classList.remove('d-none');
        }
    }
}

// Start the voting process
function startVoting() {
    if (gameState.nominatedPlayers.length === 0) return;
    
    gameState.phase = 'voting';
    document.getElementById('startVoting').classList.add('d-none');
    document.getElementById('goToNight').classList.add('d-none');
    document.getElementById('votingSection').classList.remove('d-none');
    document.getElementById('votingControls').classList.remove('d-none');
    
    // Сбрасываем результаты предыдущего голосования
    gameState.votingResults = {};
    
    renderVotingOptions();
}

// Render voting options
function renderVotingOptions() {
    const nominatedPlayersEl = document.getElementById('nominatedPlayers');
    nominatedPlayersEl.innerHTML = '<h5>Кандидаты на голосование:</h5>';
    
    const alivePlayers = gameState.players.filter(p => p.isAlive && !p.isEliminated).length;
    const usedVotes = Object.values(gameState.votingResults).reduce((a, b) => a + b, 0);
    const remainingTotalVotes = alivePlayers - usedVotes;
    
    gameState.nominatedPlayers.forEach(playerId => {
        const player = gameState.players.find(p => p.id === playerId);
        const playerRow = document.createElement('div');
        playerRow.className = 'row mb-2 align-items-center';
        
        const playerInfo = document.createElement('div');
        playerInfo.className = 'col-md-4';
        playerInfo.textContent = `${player.id}: ${player.name}`;
        playerRow.appendChild(playerInfo);
        
        const votingOptions = document.createElement('div');
        votingOptions.className = 'col-md-8';
        
        // Определяем, сколько голосов можно отдать за этого кандидата
        let maxPossibleVotes = remainingTotalVotes;
        if (gameState.votingResults[playerId] !== undefined) {
            maxPossibleVotes += gameState.votingResults[playerId];
        }
        
        // Создаем кнопки для возможных голосов
        for (let i = 1; i <= maxPossibleVotes; i++) {
            const voteBtn = document.createElement('button');
            voteBtn.className = 'btn vote-sm ' + 
                (gameState.votingResults[playerId] === i ? 'btn-primary' : 'btn-outline-primary');
            voteBtn.textContent = i;
            voteBtn.onclick = () => registerVotes(playerId, i);
            votingOptions.appendChild(voteBtn);
        }
        
        playerRow.appendChild(votingOptions);
        nominatedPlayersEl.appendChild(playerRow);
    });
    
    // Display voting results
    const votingResultsEl = document.getElementById('votingResults');
    votingResultsEl.innerHTML = '<h5>Результаты голосования:</h5>';
    
    if (Object.keys(gameState.votingResults).length > 0) {
        const resultsList = document.createElement('ul');
        resultsList.className = 'list-group';
        
        Object.entries(gameState.votingResults).forEach(([playerId, votes]) => {
            const player = gameState.players.find(p => p.id === parseInt(playerId));
            const resultItem = document.createElement('li');
            resultItem.className = 'list-group-item';
            resultItem.textContent = `${player.id}: ${player.name} - ${votes} голосов`;
            resultsList.appendChild(resultItem);
        });
        
        // Добавляем информацию об оставшихся голосах
        const remainingItem = document.createElement('li');
        remainingItem.className = 'list-group-item';
        remainingItem.textContent = `Осталось голосов: ${remainingTotalVotes}`;
        resultsList.appendChild(remainingItem);
        
        votingResultsEl.appendChild(resultsList);
    }
}

// Register votes for a player
function registerVotes(playerId, votes) {
    gameState.votingResults[playerId] = votes;
    renderVotingOptions();
}

// Confirm voting results
function confirmVoting() {
    if (Object.keys(gameState.votingResults).length === 0) return;
    
    // Find the player with the most votes
    let maxVotes = 0;
    let playersWithMaxVotes = [];
    
    Object.entries(gameState.votingResults).forEach(([playerId, votes]) => {
        if (votes > maxVotes) {
            maxVotes = votes;
            playersWithMaxVotes = [parseInt(playerId)];
        } else if (votes === maxVotes) {
            playersWithMaxVotes.push(parseInt(playerId));
        }
    });

    // Если есть несколько игроков с одинаковым числом голосов и это не те же игроки, что были в прошлой перестрелке
    const isSameShootout = playersWithMaxVotes.length === gameState.shootoutPlayers.length && 
          playersWithMaxVotes.every(id => gameState.shootoutPlayers.includes(id));
    
    // Если есть ничья и это не та же перестрелка, что была раньше
    if (playersWithMaxVotes.length > 1 && !isSameShootout) {
        startShootout(playersWithMaxVotes);
        return;
    }
    
    // If we're in a shootout and still have a tie
    if (gameState.shootoutPlayers.length > 0 && playersWithMaxVotes.length > 1) {
        askAboutMultipleElimination(playersWithMaxVotes);
        return;
    }
    
    // Otherwise, eliminate the player with the most votes
    if (playersWithMaxVotes.length === 1) {
        eliminateVotedPlayer(playersWithMaxVotes[0]);
    }
    
    // Reset shootout state
    gameState.shootoutPlayers = [];
    
    // Скрываем секцию голосования и показываем кнопку "В ночь"
    document.getElementById('votingSection').classList.add('d-none');
    document.getElementById('votingControls').classList.add('d-none');
    document.getElementById('goToNight').classList.remove('d-none');
    
    // Reset voting data
    gameState.nominatedPlayers = [];
    gameState.votingResults = {};
    
    renderPlayers();
}

// Start a shootout between tied players
function startShootout(players) {
    gameState.shootoutPlayers = players;
    
    // Reset voting
    gameState.votingResults = {};
    gameState.nominatedPlayers = players;
    
    const statusEl = document.getElementById('gameStatus');
    statusEl.textContent = `Перестрелка между игроками: ${players.map(id => {
                const player = gameState.players.find(p => p.id === id);
                return `${id}: ${player.name}`;
            }).join(', ')}`;
    statusEl.classList.remove('d-none');
    
    renderVotingOptions();
}

// Ask if multiple players should be eliminated
function askAboutMultipleElimination(players) {
    const alivePlayers = gameState.players.filter(p => p.isAlive && !p.isEliminated).length;
    
    if (players.length >= alivePlayers / 2) {
        // Cannot eliminate half or more of the players
        const statusEl = document.getElementById('gameStatus');
        statusEl.textContent = `Нельзя поднять ${players.length} игроков, когда за столом всего ${alivePlayers}. Начинается ночь.`;
        statusEl.classList.remove('d-none');
        
        document.getElementById('goToNight').classList.remove('d-none');
        document.getElementById('votingControls').classList.add('d-none');
        
        // Reset voting data
        gameState.nominatedPlayers = [];
        gameState.votingResults = {};
        gameState.shootoutPlayers = [];
        
        gameState.noCandidatesRounds++;
        checkGameEnd();
        
        return;
    }
    
    const votingResultsEl = document.getElementById('votingResults');
    const voteForLiftDiv = document.createElement('div');
    voteForLiftDiv.className = 'mt-3';
    voteForLiftDiv.innerHTML = `<h5>Сколько человек проголосовало за подъем игроков: ${players.map(id => {
                const player = gameState.players.find(p => p.id === id);
                return `${id}: ${player.name}`;
            }).join(', ')}?</h5>`;
    
    const votingOptions = document.createElement('div');
    votingOptions.className = 'd-flex flex-wrap';
    
    for (let i = 0; i <= alivePlayers; i++) {
        const voteBtn = document.createElement('button');
        voteBtn.className = 'btn vote-btn btn-outline-primary';
        voteBtn.textContent = i;
        voteBtn.onclick = () => confirmMultipleElimination(players, i, alivePlayers);
        votingOptions.appendChild(voteBtn);
    }
    
    voteForLiftDiv.appendChild(votingOptions);
    votingResultsEl.appendChild(voteForLiftDiv);
    
    document.getElementById('votingControls').classList.add('d-none');
}

// Confirm multiple elimination based on majority vote
function confirmMultipleElimination(players, votes, totalPlayers) {
    const statusEl = document.getElementById('gameStatus');
    
    if (votes > totalPlayers / 2) {
        // Eliminate all players
        players.forEach(playerId => {
            eliminateVotedPlayer(playerId, false);
        });
        
        statusEl.textContent = `Игроки ${players.map(id => id).join(', ')} заголосованы.`;
    } else {
        statusEl.textContent = `Недостаточно голосов для подъема. Никто не выбывает.`;
        gameState.noCandidatesRounds++;
        checkGameEnd();
    }
    
    statusEl.classList.remove('d-none');
    
    // Show "Go to Night" button
    document.getElementById('goToNight').classList.remove('d-none');
    document.getElementById('votingSection').classList.add('d-none');
    
    // Reset voting data
    gameState.nominatedPlayers = [];
    gameState.votingResults = {};
    gameState.shootoutPlayers = [];
    
    renderPlayers();
}

// Eliminate a player after voting
function eliminateVotedPlayer(playerId, resetNoCandidates = true) {
    const player = gameState.players.find(p => p.id === playerId);
    player.isEliminated = true;
    player.isAlive = false;
    gameState.eliminatedPlayers.push(playerId);
    
    // Reset all nominations for this player
    gameState.players.forEach(p => {
        if (p.nominated === playerId) {
            p.nominated = null;
        }
    });
    
    if (resetNoCandidates) {
        gameState.noCandidatesRounds = 0;
    }
    
    checkGameEnd();
}

// Reset voting
function resetVoting() {
    gameState.votingResults = {};
    renderVotingOptions();
}

// Go to night phase
function goToNight() {
    gameState.phase = 'night';
    document.getElementById('votingSection').classList.add('d-none');
    document.getElementById('votingControls').classList.add('d-none');
    document.getElementById('goToNight').classList.add('d-none');
    document.getElementById('gameStatus').classList.add('d-none');
    document.getElementById('nightSection').classList.remove('d-none');
    document.getElementById('nightControls').classList.remove('d-none');
    
    // Reset night targets
    gameState.mafiaTarget = null;
    gameState.donTarget = null;
    gameState.sheriffTarget = null;
    gameState.nominatedPlayers = [];
    
    renderNightActions();
}

// Render night actions
function renderNightActions() {
    // Mafia targets
    const mafiaTargetsEl = document.getElementById('mafiaTargets');
    mafiaTargetsEl.innerHTML = '';
    
    // Check if there are any mafia members alive
    const mafiaAlive = gameState.players.some(p => 
        (p.originalRole === 'Мафия' || p.originalRole === 'Дон') && 
            p.isAlive && !p.isEliminated);
    
    if (mafiaAlive) {
        // Add all alive players as potential targets
        gameState.players.forEach(p => {
            if (p.isAlive && !p.isEliminated) {
                const targetBtn = document.createElement('button');
                targetBtn.className = 'btn vote-btn ' + 
                    (gameState.mafiaTarget === p.id ? 'btn-danger' : 'btn-outline-danger');
                targetBtn.textContent = `${p.id}`;
                targetBtn.onclick = () => selectMafiaTarget(p.id);
                mafiaTargetsEl.appendChild(targetBtn);
            }
        });
        
        // Add "Miss" button
        const missBtn = document.createElement('button');
        missBtn.className = 'btn m-1 ' + 
            (gameState.mafiaTarget === 0 ? 'btn-secondary' : 'btn-outline-secondary');
        missBtn.textContent = 'Промах';
        missBtn.onclick = () => selectMafiaTarget(0);
        mafiaTargetsEl.appendChild(missBtn);
    } else {
        mafiaTargetsEl.innerHTML = '<p>Нет живых игроков команды мафии.</p>';
    }
    
    // Don checks
    const donTargetsEl = document.getElementById('donTargets');
    donTargetsEl.innerHTML = '';
    
    // Check if don is alive
    const donAlive = gameState.players.some(p => 
        p.originalRole === 'Дон' && p.isAlive && !p.isEliminated);
    
    if (donAlive) {
        // Add all players (including eliminated) as potential checks
        gameState.players.forEach(p => {
            const targetBtn = document.createElement('button');
            targetBtn.className = 'btn vote-btn ' + 
                (gameState.donTarget === p.id ? 'btn-info' : 'btn-outline-info');
            targetBtn.textContent = `${p.id}`;
            targetBtn.onclick = () => selectDonTarget(p.id);
            donTargetsEl.appendChild(targetBtn);
        });
        
        // Show result if target selected
        if (gameState.donTarget) {
            const checkedPlayer = gameState.players.find(p => p.id === gameState.donTarget);
            const isSheriff = checkedPlayer.originalRole === 'Шериф';
            
            const resultEl = document.getElementById('donResult');
            resultEl.className = 'alert mt-2 ' + (isSheriff ? 'alert-danger' : 'alert-success');
            resultEl.textContent = isSheriff ? 
                `Игрок ${checkedPlayer.id}: ${checkedPlayer.name} является шерифом!` : 
                `Игрок ${checkedPlayer.id}: ${checkedPlayer.name} не является шерифом.`;
            resultEl.classList.remove('d-none');
        }
    } else {
        donTargetsEl.innerHTML = '<p>Дон мертв или отсутствует.</p>';
    }
    
    // Sheriff checks
    const sheriffTargetsEl = document.getElementById('sheriffTargets');
    sheriffTargetsEl.innerHTML = '';
    
    // Check if sheriff is alive
    const sheriffAlive = gameState.players.some(p => 
        p.originalRole === 'Шериф' && p.isAlive && !p.isEliminated);
    
    if (sheriffAlive) {
        // Add all players (including eliminated) as potential checks
        gameState.players.forEach(p => {
            const targetBtn = document.createElement('button');
            targetBtn.className = 'btn vote-btn ' + 
                (gameState.sheriffTarget === p.id ? 'btn-warning' : 'btn-outline-warning');
            targetBtn.textContent = `${p.id}`;
	    targetBtn.onclick = () => selectSheriffTarget(p.id);
            sheriffTargetsEl.appendChild(targetBtn);
        });
        
        // Show result if target selected
        if (gameState.sheriffTarget) {
            const checkedPlayer = gameState.players.find(p => p.id === gameState.sheriffTarget);
            const isMafia = checkedPlayer.originalRole === 'Мафия' || checkedPlayer.originalRole === 'Дон';
            
            const resultEl = document.getElementById('sheriffResult');
            resultEl.className = 'alert mt-2 ' + (isMafia ? 'alert-danger' : 'alert-success');
            resultEl.textContent = isMafia ? 
                `Игрок ${checkedPlayer.id}: ${checkedPlayer.name} является членом мафии!` : 
                `Игрок ${checkedPlayer.id}: ${checkedPlayer.name} является мирным жителем.`;
            resultEl.classList.remove('d-none');
        }
    } else {
        sheriffTargetsEl.innerHTML = '<p>Шериф мертв или отсутствует.</p>';
    }
}

// Select mafia target
function selectMafiaTarget(playerId) {
    gameState.mafiaTarget = playerId;
    renderNightActions();
}

// Select don target
function selectDonTarget(playerId) {
    gameState.donTarget = playerId;
    renderNightActions();
}

// Select sheriff target
function selectSheriffTarget(playerId) {
    gameState.sheriffTarget = playerId;
    renderNightActions();
}

// Confirm night results
function confirmNight() {
    gameState.players.forEach(p => {
        p.nominated = null;
    });
    
    // Process mafia kill
    if (gameState.mafiaTarget && gameState.mafiaTarget !== 0) {
        const target = gameState.players.find(p => p.id === gameState.mafiaTarget);
        
        if (target && target.isAlive && !target.isEliminated) {
            target.isAlive = false;
            gameState.deadPlayers.push(gameState.mafiaTarget);
            gameState.nightKill = gameState.mafiaTarget;
            
            // Reset all nominations for this player
            gameState.players.forEach(p => {
                if (p.nominated === gameState.mafiaTarget) {
                    p.nominated = null;
                }
            });
        }
    }
    
    // Move to the next day
    gameState.round++;
    gameState.phase = 'day';
    document.getElementById('roundNumber').textContent = gameState.round;
    document.getElementById('nightSection').classList.add('d-none');
    document.getElementById('nightControls').classList.add('d-none');
    
    // Apply "silent next round" status
    gameState.players.forEach(p => {
        if (p.silentNextRound) {
            p.isSilent = true;
            p.silentNextRound = false;
        } else if (p.isSilent) {
            p.isSilent = false;
        }
    });
    
    // Reset timer
    resetTimer();
    
    // Если за ночь или на нулевом кругу никто не покинул стол
    if (gameState.deadPlayers.length === 1 && gameState.eliminatedPlayers.length === 0 && gameState.round === 1) {
        // Первый убитый (ПУ) имеет право на лучший ход
        showBestMove(gameState.deadPlayers[0]);
    } else {
        renderPlayers();
        checkGameEnd();
        
        // Важно вызвать это после перехода в дневную фазу
        updateNominatedPlayers();
    }
}

// Show best move for the first killed player
function showBestMove(playerId) {
    const player = gameState.players.find(p => p.id === playerId);
    document.getElementById('bestMoveSection').classList.remove('d-none');
    document.getElementById('bestMoveControls').classList.remove('d-none');
    gameState.bestMoveTargets = new Set();
    
    const bestMovePlayerEl = document.getElementById('bestMovePlayer');
    bestMovePlayerEl.innerHTML = `<h5>Лучший ход для игрока ${player.id}: ${player.name}</h5>`;
    
    const bestMoveChoicesEl = document.getElementById('bestMoveChoices');
    bestMoveChoicesEl.innerHTML = '';
    
    gameState.players.forEach(p => {
        if (p.id !== playerId) {
            const playerBtn = document.createElement('button');
            playerBtn.className = 'btn vote-btn btn-outline-primary';
            playerBtn.textContent = `${p.id}`;
            playerBtn.onclick = () => toggleBestMoveTarget(p.id, playerBtn);
            
            bestMoveChoicesEl.appendChild(playerBtn);
        }
    });
    
    document.getElementById('bestMoveSelected').textContent = '0';
    document.getElementById('confirmBestMove').disabled = true;
}

// Toggle best move target selection
function toggleBestMoveTarget(playerId, button) {
    if (gameState.bestMoveTargets.has(playerId)) {
        gameState.bestMoveTargets.delete(playerId);
        button.classList.remove('btn-success');
        button.classList.add('btn-outline-primary');
    } else if (gameState.bestMoveTargets.size < 3) {
        gameState.bestMoveTargets.add(playerId);
        button.classList.remove('btn-outline-primary');
        button.classList.add('btn-success');
    }
    
    document.getElementById('bestMoveSelected').textContent = gameState.bestMoveTargets.size;
    document.getElementById('confirmBestMove').disabled = gameState.bestMoveTargets.size !== 3;
}

// Confirm best move
function confirmBestMove() {
    gameState.bestMoveUsed = true;
    document.getElementById('bestMoveSection').classList.add('d-none');
    document.getElementById('bestMoveControls').classList.add('d-none');
    renderPlayers();
    checkGameEnd();
    updateNominatedPlayers();
}

// Check if the game has ended
function checkGameEnd() {
    const mafiaCount = gameState.players.filter(p => 
        (p.originalRole === 'Мафия' || p.originalRole === 'Дон') && 
            p.isAlive && !p.isEliminated).length;
    
    const civilianCount = gameState.players.filter(p => 
        (p.originalRole === 'Мирный' || p.originalRole === 'Шериф') && 
            p.isAlive && !p.isEliminated).length;
    
    const statusEl = document.getElementById('gameStatus');
    
    if (mafiaCount === 0) {
        statusEl.textContent = 'Конец игры! Победа мирного города!';
        statusEl.className = 'alert alert-success';
        statusEl.classList.remove('d-none');
        endGame();
    } else if (mafiaCount >= civilianCount) {
        statusEl.textContent = 'Конец игры! Победа команды мафии!';
        statusEl.className = 'alert alert-danger';
        statusEl.classList.remove('d-none');
        endGame();
    } else if (gameState.noCandidatesRounds >= 3) {
        statusEl.textContent = 'Конец игры! Ничья! 3 круга не было голосований.';
        statusEl.className = 'alert alert-warning';
        statusEl.classList.remove('d-none');
        endGame();
    }
}

// End the game
function endGame() {
    gameState.isGameStarted = false;
    
    // Disable all game actions
    document.getElementById('startVoting').classList.add('d-none');
    document.getElementById('goToNight').classList.add('d-none');
    document.getElementById('ppkButton').classList.add('d-none');
    document.getElementById('ppkControls').classList.add('d-none');   
    document.getElementById('votingSection').classList.add('d-none');
    document.getElementById('votingControls').classList.add('d-none');
    document.getElementById('nightSection').classList.add('d-none');
    document.getElementById('nightControls').classList.add('d-none');
    document.getElementById('bestMoveSection').classList.add('d-none');
    document.getElementById('bestMoveControls').classList.add('d-none');
    
    // Show all roles
    gameState.players.forEach(p => {
        p.role = p.originalRole;
    });
    renderPlayers();
    
    // Stop timer
    stopTimer();
}

// Start the game
function startGame() {
    if (gameState.players.filter(p => p.role === 'Мафия').length !== 2 ||
        gameState.players.filter(p => p.role === 'Дон').length !== 1 ||
        gameState.players.filter(p => p.role === 'Шериф').length !== 1) {
        alert('Необходимо распределить 2 мафии, 1 дона и 1 шерифа!');
        return;
    }
    
    gameState.isGameStarted = true;
    gameState.phase = 'day';
    
    document.getElementById('startDistribution').classList.add('d-none');
    document.getElementById('startGame').classList.add('d-none');
    document.getElementById('ppkButton').classList.remove('d-none');
    
    // Проверяем условия для начала голосования
    updateNominatedPlayers();
    
    // Start timer
    resetTimer();
    
    renderPlayers();
}

// Timer functions
function startTimer() {
    stopTimer();
    timerInterval = setInterval(updateTimer, 1000);
    document.getElementById('startTimer').classList.add('d-none');
    document.getElementById('stopTimer').classList.remove('d-none');
}

function stopTimer() {
    clearInterval(timerInterval);
    document.getElementById('startTimer').classList.remove('d-none');
    document.getElementById('stopTimer').classList.add('d-none');
}

function resetTimer() {
    stopTimer();
    timerSeconds = 0;
    updateTimerDisplay();
    startTimer(); // Auto-start the timer after reset
}

function updateTimer() {
    timerSeconds++;
    updateTimerDisplay();
}

function updateTimerDisplay() {
    const minutes = Math.floor(timerSeconds / 60);
    const seconds = timerSeconds % 60;
    document.getElementById('timer').textContent = 
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Функция для показа ППК контролов
function showPpkControls() {
    document.getElementById('ppkButton').classList.add('d-none');
    document.getElementById('ppkControls').classList.remove('d-none');
}

// Функция для скрытия ППК контролов
function hidePpkControls() {
    document.getElementById('ppkButton').classList.remove('d-none');
    document.getElementById('ppkControls').classList.add('d-none');
}

// Функция для объявления победы мафии
function declareMafiaWin() {
    const statusEl = document.getElementById('gameStatus');
    statusEl.textContent = 'Конец игры! Победа команды мафии!';
    statusEl.className = 'alert alert-danger';
    statusEl.classList.remove('d-none');
    endGame();
}

// Функция для объявления победы города
function declareCityWin() {
    const statusEl = document.getElementById('gameStatus');
    statusEl.textContent = 'Конец игры! Победа мирного города!';
    statusEl.className = 'alert alert-success';
    statusEl.classList.remove('d-none');
    endGame();
}

function toggleRolesVisibility() {
    rolesVisible = !rolesVisible;
    renderPlayers();
}

// Setup event listeners
function setupEventListeners() {
    document.getElementById('startDistribution').addEventListener('click', initDistribution);
    document.getElementById('startGame').addEventListener('click', startGame);
    document.getElementById('startVoting').addEventListener('click', startVoting);
    document.getElementById('goToNight').addEventListener('click', goToNight);
    document.getElementById('confirmVoting').addEventListener('click', confirmVoting);
    document.getElementById('resetVoting').addEventListener('click', resetVoting);
    document.getElementById('confirmNight').addEventListener('click', confirmNight);
    document.getElementById('confirmBestMove').addEventListener('click', confirmBestMove);
    
    document.getElementById('startTimer').addEventListener('click', startTimer);
    document.getElementById('stopTimer').addEventListener('click', stopTimer);
    document.getElementById('resetTimer').addEventListener('click', resetTimer);

    document.getElementById('ppkButton').addEventListener('click', showPpkControls);
    document.getElementById('cancelPpk').addEventListener('click', hidePpkControls);
    document.getElementById('mafiaWin').addEventListener('click', declareMafiaWin);
    document.getElementById('cityWin').addEventListener('click', declareCityWin);
    document.querySelector('.row.mb-2.fw-bold .col-2.text-center').addEventListener('click', toggleRolesVisibility);

}

function initDistribution() {
    document.getElementById('startDistribution').classList.add('d-none');
    gameState.phase = 'distribution';
    renderPlayers();
}

// Initialize the game when page loads
window.onload = initGame;
