window.addEventListener("DOMContentLoaded", () => {

    function showTransition(callback) {
        const overlay = document.getElementById("transitionOverlay");
        const flash = document.getElementById("crtFlash");

        if (!overlay || !flash) {
            callback();
            return;
        }

        overlay.style.display = "flex";

        setTimeout(() => {
            flash.style.animation = "crtFlashAnim 0.25s ease-out";
            setTimeout(() => {
                flash.style.animation = "";
                overlay.style.display = "none";
                callback();
            }, 250);
        }, 700);
    }

    const jatekTab = document.getElementById("jatek");
    const gameContainer = document.getElementById("gameContainer");
    const canvas = document.getElementById("platformerCanvas");
    if (!jatekTab || !canvas || !gameContainer) return;

    const ctx = canvas.getContext("2d");

    function hideAllPages() {
        document.getElementById("fo").style.display = "none";
        document.getElementById("tortenet").style.display = "none";
        document.getElementById("jatek").style.display = "none";
        document.getElementById("keszites").style.display = "none";

        document.getElementById("gameContainer").style.display = "none";
        document.getElementById("puzzleContainer").style.display = "none";
        document.getElementById("memoryContainer").style.display = "none";
        document.getElementById("pongContainer").style.display = "none";
    }

    window.showTab = function(tab) {
        hideAllPages();
        const page = document.getElementById(tab);
        if (page) {
            page.style.display = "block";
        }
        window.scrollTo({ top: 0, behavior: "instant" });
    };

    const palyaGombok = document.querySelectorAll(".palyaBtn");
    let stage = 0;

    palyaGombok.forEach(btn => {
        btn.addEventListener("click", () => {
            stage = Number(btn.dataset.stage);
            startGame();
        });
    });

    const rulesBtn = document.getElementById("rules-btn");
    const rulesBox = document.createElement("div");
    rulesBox.style.position = "fixed";
    rulesBox.style.left = "50%";
    rulesBox.style.top = "50%";
    rulesBox.style.transform = "translate(-50%, -50%)";
    rulesBox.style.background = "white";
    rulesBox.style.padding = "25px";
    rulesBox.style.border = "3px solid #e6b85c";
    rulesBox.style.borderRadius = "20px";
    rulesBox.style.fontSize = "22px";
    rulesBox.style.display = "none";
    rulesBox.style.zIndex = "9999";
    rulesBox.innerHTML = `
        <h2>Játékszabály</h2>
        <p>SPACE – ugrás</p>
        <p>R – újraindítás</p>
        <p>Kerüld el az akadályokat!</p>
        <p>Válaszd ki bal oldalt a pályát:</p>
        <ul>
            <li>🌞 Nappali</li>
            <li>❄️ Téli</li>
            <li>🌲 Sötét erdő</li>
        </ul>
        <button id="closeRules">Bezárás</button>
    `;
    document.body.appendChild(rulesBox);

    rulesBtn.addEventListener("click", () => {
        rulesBox.style.display = "block";
    });

    document.addEventListener("click", (e) => {
        if (e.target.id === "closeRules") {
            rulesBox.style.display = "none";
        }
    });

    const maciRun1 = new Image();
    maciRun1.src = "maci_fut1.png";
    const maciRun2 = new Image();
    maciRun2.src = "maci_fut2.png";
    const maciJump = new Image();
    maciJump.src = "maci_ugrik.png";

    const MACI_WIDTH = 66;
    const MACI_HEIGHT = 66;

    let jumps = 0;
    let highJumps = Number(localStorage.getItem("highJumps")) || 0;

    let runFrame = 0;
    let runCounter = 0;
    const RUN_SPEED = 15;

    let player, obstacles, clouds, hills, trees;
    let snowflakes = [];
    let frame, score, gameOver, running, baseSpeed, spawnInterval, animationId;

    let dust = [];

    const hudBox = document.getElementById("hudBox");
    const restartButton = document.getElementById("restartButton");
    const jumpText = document.getElementById("jumpText");
    const highJumpText = document.getElementById("highJumpText");

    jumpText.textContent = "Pontszám: 0";
    highJumpText.textContent = "Rekord ugrás: " + highJumps;

    restartButton.addEventListener("click", () => {
        if (!running || gameOver) {
            startGame();
        }
    });

    function resetGame() {
        jumps = 0;

        player = {
            x: 80,
            y: 240,
            width: MACI_WIDTH,
            height: MACI_HEIGHT,
            dy: 0,
            gravity: 0.6,
            jumpPower: -14,
            onGround: true
        };

        obstacles = [];
        clouds = [];
        hills = [];
        trees = [];
        snowflakes = [];
        dust = [];

        frame = 0;
        score = 0;
        gameOver = false;
        running = false;
        baseSpeed = 4;
        spawnInterval = 120;
        runFrame = 0;
        runCounter = 0;

        jumpText.textContent = "Pontszám: 0";
        restartButton.style.display = "none";

        for (let i = 0; i < 5; i++) {
            clouds.push({
                x: Math.random() * canvas.width,
                y: 40 + Math.random() * 60,
                speed: 0.3 + Math.random() * 0.3
            });
        }

        for (let i = 0; i < 4; i++) {
            hills.push({
                x: i * 250,
                y: 220,
                width: 250,
                height: 80,
                speed: 0.8
            });
        }

        for (let i = 0; i < 4; i++) {
            trees.push({
                x: i * 200 + 100,
                y: 200,
                width: 40,
                height: 80,
                speed: 1.2
            });
        }

        for (let i = 0; i < 80; i++) {
            snowflakes.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                speed: 0.5 + Math.random() * 1
            });
        }
    }

    let lastSpeedUpScore = 0;
    resetGame();

    document.addEventListener("keydown", (e) => {
        if (e.code === "Space") e.preventDefault();
        if (gameContainer.style.display !== "block") return;

        if (e.code === "Space") {
            if (running && !gameOver && player.onGround) {
                player.dy = player.jumpPower;
                player.onGround = false;

                jumps++;
                jumpText.textContent = "Ugrások: " + jumps;

                if (jumps > highJumps) {
                    highJumps = jumps;
                    localStorage.setItem("highJumps", highJumps);
                    highJumpText.textContent = "Rekord ugrás: " + highJumps;
                }
            }
        }

        if (e.code === "KeyR") {
            if (!running || gameOver) {
                startGame();
            }
        }
    });

    function drawSnow() {
        if (stage !== 1) return;
        ctx.fillStyle = "white";
        snowflakes.forEach(s => {
            s.y += s.speed;
            if (s.y > canvas.height) s.y = -10;
            ctx.beginPath();
            ctx.arc(s.x, s.y, 2, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    function drawBackground() {
        if (stage === 2) {
            ctx.fillStyle = "#0a0a0a";
        } else if (stage === 1) {
            ctx.fillStyle = "#e0f7ff";
        } else {
            ctx.fillStyle = "#b9e6ff";
        }
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        if (stage === 2) {
            ctx.fillStyle = "#111";
            ctx.fillRect(0, 280, canvas.width, 20);
            return;
        }

        ctx.fillStyle = "#ffffff";
        clouds.forEach(c => {
            ctx.beginPath();
            ctx.ellipse(c.x, c.y, 40, 20, 0, 0, Math.PI * 2);
            ctx.fill();
        });

        ctx.fillStyle = "#a4c88f";
        hills.forEach(h => {
            ctx.beginPath();
            ctx.moveTo(h.x, h.y + h.height);
            ctx.quadraticCurveTo(
                h.x + h.width / 2,
                h.y,
                h.x + h.width,
                h.y + h.height
            );
            ctx.lineTo(h.x + h.width, canvas.height);
            ctx.lineTo(h.x, canvas.height);
            ctx.closePath();
            ctx.fill();
        });

        trees.forEach(t => {
            ctx.fillStyle = "#8b5a2b";
            ctx.fillRect(t.x, t.y, t.width, t.height);

            ctx.fillStyle = "#2e8b57";
            ctx.beginPath();
            ctx.arc(t.x + t.width / 2, t.y, 30, 0, Math.PI * 2);
            ctx.fill();
        });

        if (stage === 1) {
            ctx.fillStyle = "#ffffff";
        } else {
            ctx.fillStyle = "#c2b280";
        }
        ctx.fillRect(0, 280, canvas.width, 20);
    }

    function updateBackground() {
        if (stage === 2) return;

        clouds.forEach(c => {
            c.x -= c.speed;
            if (c.x < -60) {
                c.x = canvas.width + Math.random() * 100;
                c.y = 40 + Math.random() * 60;
            }
        });

        hills.forEach(h => {
            h.x -= h.speed * (baseSpeed / 4);
            if (h.x + h.width < 0) h.x = canvas.width;
        });

        trees.forEach(t => {
            t.x -= t.speed * (baseSpeed / 3);
            if (t.x + t.width < 0) t.x = canvas.width + Math.random() * 100;
        });
    }

    function spawnObstacle() {
        const normalSizes = [
            { w: 25, h: 35 },
            { w: 30, h: 40 },
            { w: 40, h: 55 }
        ];

        const specialSizes = [
            { w: 20, h: 70 },
            { w: 60, h: 30 },
            { w: 50, h: 50 }
        ];

        const allSizes = [...normalSizes, ...specialSizes];
        const pick = allSizes[Math.floor(Math.random() * allSizes.length)];

        const groundY = 260;
        const baseHeight = 40;

        obstacles.push({
            x: canvas.width,
            y: groundY - (pick.h - baseHeight),
            width: pick.w,
            height: pick.h
        });
    }

    function isColliding(a, b) {
        return (
            a.x < b.x + b.width &&
            a.x + a.width > b.x &&
            a.y < b.y + b.height &&
            a.y + a.height > b.y
        );
    }

    function drawMaci() {
        let imgToDraw = maciRun1;

        if (!player.onGround) {
            imgToDraw = maciJump;
        } else {
            if (baseSpeed > 0) {
                runCounter++;
                if (runCounter >= RUN_SPEED) {
                    runFrame = (runFrame + 1) % 2;
                    runCounter = 0;
                }
            }
            imgToDraw = (runFrame === 0) ? maciRun1 : maciRun2;
        }

        if (imgToDraw.complete && imgToDraw.naturalWidth > 0) {
            ctx.drawImage(imgToDraw, player.x, player.y, MACI_WIDTH, MACI_HEIGHT);
        }
    }

    function gameLoop() {
        if (!running) return;
        if (gameContainer.style.display !== "block") {
            running = false;
            return;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        drawSnow();
        drawBackground();
        updateBackground();

        player.dy += player.gravity;
        player.y += player.dy;

        if (player.y >= 240) {
            if (!player.onGround) {
                for (let i = 0; i < 8; i++) {
                    dust.push({
                        x: player.x + MACI_WIDTH / 2,
                        y: 240 + MACI_HEIGHT - 10,
                        dx: (Math.random() - 0.5) * 3,
                        dy: -Math.random() * 2,
                        size: 4 + Math.random() * 3,
                        life: 20
                    });
                }
            }
            player.y = 240;
            player.dy = 0;
            player.onGround = true;
        } else {
            player.onGround = false;
        }

        drawMaci();

        obstacles.forEach((obs, index) => {
            obs.x -= baseSpeed;

            if (stage === 2) {
                ctx.fillStyle = "#ffffff";
            } else {
                ctx.fillStyle = "#333";
            }
            ctx.fillRect(obs.x, obs.y, obs.width, obs.height);

            if (isColliding(player, obs)) {
                gameOver = true;
                running = false;
                restartButton.style.display = "inline-block";
            }

            if (obs.x + obs.width < 0) {
                obstacles.splice(index, 1);
                if (!gameOver) {
                    score++;
                    jumpText.textContent = "Pontszám: " + score;
                }
            }
        });

        dust.forEach((p, i) => {
            p.x += p.dx;
            p.y += p.dy;
            p.dy += 0.1;
            p.life--;

            ctx.fillStyle = "rgba(200, 200, 200, " + (p.life / 20) + ")";
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();

            if (p.life <= 0) dust.splice(i, 1);
        });

        frame++;
        if (frame % spawnInterval === 0) spawnObstacle();

        if (score > 0 && score % 5 === 0 && score !== lastSpeedUpScore) {
            baseSpeed += 0.3;
            lastSpeedUpScore = score;
            spawnInterval = Math.max(60, 120 - score * 2);
        }

        animationId = requestAnimationFrame(gameLoop);
    }

    function startGame() {
        cancelAnimationFrame(animationId);
        resetGame();
        running = true;
        gameOver = false;
        hudBox.style.display = "block";
        gameLoop();
    }

    function stopGame() {
        running = false;
        cancelAnimationFrame(animationId);
        hudBox.style.display = "none";
    }

    window.openGame = function() {
        showTransition(() => {
            hideAllPages();
            gameContainer.style.display = "block";
            startGame();
            window.scrollTo({ top: 0, behavior: "instant" });
        });
    };

    window.closeGame = function() {
        stopGame();
        gameContainer.style.display = "none";
        document.getElementById("jatek").style.display = "block";
        window.scrollTo({ top: 0, behavior: "instant" });
    };

    window.restartGame = function() {
        startGame();
    };

    const puzzleCanvas = document.getElementById("puzzleCanvas");
    const puzzleCtx = puzzleCanvas ? puzzleCanvas.getContext("2d") : null;
    const puzzleInfo = document.getElementById("puzzleInfo");
    const difficultySelect = document.getElementById("difficultySelect");

    let puzzleImage = new Image();
    puzzleImage.src = "puzzlee1.png";

    let puzzleGridSize = 3;
    let puzzleTiles = [];
    let puzzleTileSize = 0;
    let puzzleSelectedIndex = null;
    let puzzleRunning = false;

    window.selectPuzzleImage = function(filename) {
        puzzleImage.src = filename;
        if (puzzleInfo) {
            puzzleInfo.textContent = "Kép kiválasztva! Most válassz nehézséget!";
        }
        if (difficultySelect) difficultySelect.style.display = "block";
    };

    function initPuzzle(size) {
        if (!puzzleCtx || !puzzleCanvas) return;

        puzzleGridSize = size;
        const minSide = Math.min(puzzleCanvas.width, puzzleCanvas.height);
        puzzleTileSize = Math.floor(minSide / puzzleGridSize);

        puzzleTiles = [];
        for (let i = 0; i < puzzleGridSize * puzzleGridSize; i++) {
            puzzleTiles.push(i);
        }

        for (let i = puzzleTiles.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [puzzleTiles[i], puzzleTiles[j]] = [puzzleTiles[j], puzzleTiles[i]];
        }

        puzzleSelectedIndex = null;
        puzzleRunning = true;
        drawPuzzle();
        if (puzzleInfo) {
            puzzleInfo.textContent = `Nehézség: ${size}×${size} – kattints két mezőre a cseréhez!`;
        }
    }

    function drawPuzzle() {
        if (!puzzleCtx || !puzzleCanvas) return;
        if (!puzzleImage.complete || puzzleImage.naturalWidth === 0) {
            requestAnimationFrame(drawPuzzle);
            return;
        }

        puzzleCtx.clearRect(0, 0, puzzleCanvas.width, puzzleCanvas.height);

        puzzleCtx.fillStyle = "#222";
        puzzleCtx.fillRect(0, 0, puzzleCanvas.width, puzzleCanvas.height);

        const imgW = puzzleImage.naturalWidth;
        const imgH = puzzleImage.naturalHeight;

        const tileW = imgW / puzzleGridSize;
        const tileH = imgH / puzzleGridSize;

        const offsetX = (puzzleCanvas.width - puzzleTileSize * puzzleGridSize) / 2;
        const offsetY = (puzzleCanvas.height - puzzleTileSize * puzzleGridSize) / 2;

        for (let i = 0; i < puzzleTiles.length; i++) {
            const tileIndex = puzzleTiles[i];

            const srcCol = tileIndex % puzzleGridSize;
            const srcRow = Math.floor(tileIndex / puzzleGridSize);

            const destCol = i % puzzleGridSize;
            const destRow = Math.floor(i / puzzleGridSize);

            const sx = srcCol * tileW;
            const sy = srcRow * tileH;
            const dx = offsetX + destCol * puzzleTileSize;
            const dy = offsetY + destRow * puzzleTileSize;

            puzzleCtx.drawImage(
                puzzleImage,
                sx, sy, tileW, tileH,
                dx, dy, puzzleTileSize, puzzleTileSize
            );

            if (puzzleSelectedIndex === i) {
                puzzleCtx.strokeStyle = "#ffcc66";
                puzzleCtx.lineWidth = 4;
                puzzleCtx.strokeRect(dx + 2, dy + 2, puzzleTileSize - 4, puzzleTileSize - 4);
            }
        }
    }

    function checkPuzzleSolved() {
        for (let i = 0; i < puzzleTiles.length; i++) {
            if (puzzleTiles[i] !== i) return false;
        }
        return true;
    }

    function handlePuzzleClick(e) {
        if (!puzzleRunning || !puzzleCanvas) return;

        const rect = puzzleCanvas.getBoundingClientRect();

        // skálázás: látható méret -> canvas koordináta
        const scaleX = puzzleCanvas.width / rect.width;
        const scaleY = puzzleCanvas.height / rect.height;

        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;

        const offsetX = (puzzleCanvas.width - puzzleTileSize * puzzleGridSize) / 2;
        const offsetY = (puzzleCanvas.height - puzzleTileSize * puzzleGridSize) / 2;

        if (
            x < offsetX || x > offsetX + puzzleTileSize * puzzleGridSize ||
            y < offsetY || y > offsetY + puzzleTileSize * puzzleGridSize
        ) {
            return;
        }

        const col = Math.floor((x - offsetX) / puzzleTileSize);
        const row = Math.floor((y - offsetY) / puzzleTileSize);
        const index = row * puzzleGridSize + col;

        if (puzzleSelectedIndex === null) {
            puzzleSelectedIndex = index;
        } else if (puzzleSelectedIndex === index) {
            puzzleSelectedIndex = null;
        } else {
            [puzzleTiles[puzzleSelectedIndex], puzzleTiles[index]] =
                [puzzleTiles[index], puzzleTiles[puzzleSelectedIndex]];

            puzzleSelectedIndex = null;

            if (checkPuzzleSolved()) {
                puzzleRunning = false;
                if (puzzleInfo) {
                    puzzleInfo.textContent = "Kész! Ügyes vagy, kiraktad a TV Maci szobáját!";
                }
            }
        }

        drawPuzzle();
    }

    if (puzzleCanvas) {
        puzzleCanvas.addEventListener("click", handlePuzzleClick);
    }

    window.openPuzzle = function() {
        showTransition(() => {
            hideAllPages();
            const puzzleContainer = document.getElementById("puzzleContainer");

            if (puzzleContainer) puzzleContainer.style.display = "block";

            if (puzzleInfo) puzzleInfo.textContent = "Válassz egy képet a kezdéshez!";
            if (difficultySelect) difficultySelect.style.display = "none";
            puzzleRunning = false;
            puzzleSelectedIndex = null;
            drawPuzzle();
            window.scrollTo({ top: 0, behavior: "instant" });
        });
    };

    window.closePuzzle = function() {
        const puzzleContainer = document.getElementById("puzzleContainer");

        puzzleRunning = false;
        puzzleSelectedIndex = null;

        if (puzzleContainer) puzzleContainer.style.display = "none";
        document.getElementById("jatek").style.display = "block";
        window.scrollTo({ top: 0, behavior: "instant" });
    };

    window.startPuzzle = function(size) {
        initPuzzle(size);
    };

    const memoryContainer = document.getElementById("memoryContainer");
    const memoryGameContainer = document.getElementById("memory-game");
    const movesElement = document.getElementById("moves");
    const matchesElement = document.getElementById("matches");
    const restartButtonMemory = document.getElementById("restart");

    const baseImages = [
        "tvmaci1.jpg",
        "tvmaci2.jpg",
        "tvmaci3.jpg",
        "tvmaci4.jpg",
        "tvmaci5.jpg",
        "tvmaci6.jpg",
        "tvmaci7.jpg",
        "tvmaci8.jpg",
        "tvmaci9.jpg",
        "tvmaci10.jpg",
        "tvmaci11.png",
        "tvmaci12.png",
        "tvmaci13.png",
        "tvmaci14.png",
        "tvmaci15.png"
    ];

    let cardImages = [];
    let firstCard = null;
    let secondCard = null;
    let lockBoard = false;
    let moves = 0;
    let matches = 0;
    const MAX_MOVES = 40;

    function shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    function updateMemoryStats() {
        movesElement.textContent = moves;
        matchesElement.textContent = matches;
    }

    function createMemoryBoard() {
        memoryGameContainer.innerHTML = "";
        cardImages = [...baseImages, ...baseImages];
        shuffle(cardImages);

        moves = 0;
        matches = 0;
        updateMemoryStats();

        cardImages.forEach((imgSrc) => {
            const card = document.createElement("div");
            card.classList.add("memory-card");
            card.dataset.image = imgSrc;

            const inner = document.createElement("div");
            inner.classList.add("memory-card-inner");

            const front = document.createElement("div");
            front.classList.add("memory-card-front");

            const img = document.createElement("img");
            img.src = imgSrc;
            img.alt = "TV Maci memória kártya";
            front.appendChild(img);

            const back = document.createElement("div");
            back.classList.add("memory-card-back");
            back.textContent = "TV Maci";

            inner.appendChild(front);
            inner.appendChild(back);
            card.appendChild(inner);

            card.addEventListener("click", onMemoryCardClick);

            memoryGameContainer.appendChild(card);
        });
    }

    function onMemoryCardClick(e) {
        const card = e.currentTarget;

        if (lockBoard) return;
        if (card === firstCard) return;
        if (card.classList.contains("matched")) return;

        if (moves >= MAX_MOVES) {
            alert("Sajnos vesztettél! Elfogyott a 40 fordításod.");
            createMemoryBoard();
            return;
        }

        card.classList.add("flipped");

        if (!firstCard) {
            firstCard = card;
            return;
        }

        secondCard = card;
        moves++;
        updateMemoryStats();
        checkMemoryMatch();
    }

    function checkMemoryMatch() {
        const isMatch = firstCard.dataset.image === secondCard.dataset.image;

        if (isMatch) {
            matchMemoryCards();
        } else {
            unflipMemoryCards();
        }
    }

    function matchMemoryCards() {
        firstCard.classList.add("matched");
        secondCard.classList.add("matched");

        matches++;
        updateMemoryStats();

        resetMemoryBoardState();

        if (matches === baseImages.length) {
            setTimeout(() => {
                alert("Nagyon ügyes vagy! Minden párt megtaláltál!");
            }, 300);
        }
    }

    function unflipMemoryCards() {
        lockBoard = true;

        setTimeout(() => {
            firstCard.classList.remove("flipped");
            secondCard.classList.remove("flipped");
            resetMemoryBoardState();
        }, 800);
    }

    function resetMemoryBoardState() {
        firstCard = null;
        secondCard = null;
        lockBoard = false;
    }

    restartButtonMemory.addEventListener("click", () => {
        createMemoryBoard();
    });

    createMemoryBoard();

    window.openMemory = function() {
        showTransition(() => {
            hideAllPages();
            memoryContainer.style.display = "block";
            window.scrollTo({ top: 0, behavior: "instant" });
        });
    };

    window.closeMemory = function() {
        memoryContainer.style.display = "none";
        document.getElementById("jatek").style.display = "block";
        window.scrollTo({ top: 0, behavior: "instant" });
    };

    let pongRunning = false;

    const pongCanvas = document.getElementById("pongCanvas");
    const pongCtx = pongCanvas ? pongCanvas.getContext("2d") : null;

    const pongWinnerOverlay = document.getElementById("pongWinnerOverlay");
    const pongWinnerTitle = document.getElementById("pongWinnerTitle");
    const pongWinnerText = document.getElementById("pongWinnerText");
    const pongWinnerRestart = document.getElementById("pongWinnerRestart");

    const maciHeadImg = new Image();
    maciHeadImg.src = "tvmacifej.png";

    const jancsiHeadImg = new Image();
    jancsiHeadImg.src = "jancsifej.png";

    let pongState = null;

    function startPong() {
        if (!pongCtx || !pongCanvas) return;

        const pHeight = 90;
        const pWidth = 20;

        let p1 = { x: 40, y: 155, w: pWidth, h: pHeight, dy: 0, score: 0 };
        let p2 = { x: pongCanvas.width - 40 - pWidth, y: 155, w: pWidth, h: pHeight, dy: 0, score: 0 };

        let ball = { x: pongCanvas.width / 2, y: pongCanvas.height / 2, r: 10, dx: 3, dy: 2 };

        pongState = { p1, p2, ball };
        pongRunning = true;

        const btnP1Up = document.getElementById("pongP1Up");
        const btnP1Down = document.getElementById("pongP1Down");
        const btnP2Up = document.getElementById("pongP2Up");
        const btnP2Down = document.getElementById("pongP2Down");

        function addHoldControl(button, onPress, onRelease) {
            if (!button) return;
            button.addEventListener("touchstart", (e) => {
                e.preventDefault();
                onPress();
            }, { passive: false });
            button.addEventListener("touchend", (e) => {
                e.preventDefault();
                onRelease();
            }, { passive: false });
            button.addEventListener("mousedown", (e) => {
                e.preventDefault();
                onPress();
            });
            button.addEventListener("mouseup", () => {
                onRelease();
            });
            button.addEventListener("mouseleave", () => {
                onRelease();
            });
        }

        addHoldControl(btnP1Up,   () => { p1.dy = -5; }, () => { p1.dy = 0; });
        addHoldControl(btnP1Down, () => { p1.dy =  5; }, () => { p1.dy = 0; });
        addHoldControl(btnP2Up,   () => { p2.dy = -5; }, () => { p2.dy = 0; });
        addHoldControl(btnP2Down, () => { p2.dy =  5; }, () => { p2.dy = 0; });

        const HEAD_SIZE = 60;

        function resetBall(direction) {
            ball.x = pongCanvas.width / 2;
            ball.y = pongCanvas.height / 2;
            const baseSpeed = 3;
            ball.dx = direction * baseSpeed;
            ball.dy = (Math.random() * 2 - 1) * baseSpeed * 0.6;
        }

        function clampBallSpeed() {
            const maxSpeed = 8;
            const maxDy = 7;

            if (ball.dx > maxSpeed) ball.dx = maxSpeed;
            if (ball.dx < -maxSpeed) ball.dx = -maxSpeed;
            if (ball.dy > maxDy) ball.dy = maxDy;
            if (ball.dy < -maxDy) ball.dy = -maxDy;
        }

        function drawPong() {
            pongCtx.clearRect(0, 0, pongCanvas.width, pongCanvas.height);

            pongCtx.fillStyle = "#000";
            pongCtx.fillRect(0, 0, pongCanvas.width, pongCanvas.height);

            pongCtx.setLineDash([10, 10]);
            pongCtx.strokeStyle = "#fff";
            pongCtx.lineWidth = 2;
            pongCtx.beginPath();
            pongCtx.moveTo(pongCanvas.width / 2, 0);
            pongCtx.lineTo(pongCanvas.width / 2, pongCanvas.height);
            pongCtx.stroke();
            pongCtx.setLineDash([]);

            if (jancsiHeadImg.complete && jancsiHeadImg.naturalWidth > 0) {
                const cx = p1.x + p1.w / 2 + 10;
                const cy = p1.y + p1.h / 2;
                pongCtx.drawImage(
                    jancsiHeadImg,
                    cx - HEAD_SIZE / 2,
                    cy - HEAD_SIZE / 2,
                    HEAD_SIZE,
                    HEAD_SIZE
                );
            }

            if (maciHeadImg.complete && maciHeadImg.naturalWidth > 0) {
                const cx = p2.x + p2.w / 2 - 10;
                const cy = p2.y + p2.h / 2;
                pongCtx.drawImage(
                    maciHeadImg,
                    cx - HEAD_SIZE / 2,
                    cy - HEAD_SIZE / 2,
                    HEAD_SIZE,
                    HEAD_SIZE
                );
            }

            pongCtx.beginPath();
            pongCtx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
            pongCtx.fillStyle = "#fff";
            pongCtx.fill();

            pongCtx.font = "24px Arial";
            pongCtx.fillStyle = "#ffcc66";
            pongCtx.fillText(p1.score, pongCanvas.width / 2 - 60, 30);
            pongCtx.fillText(p2.score, pongCanvas.width / 2 + 40, 30);
        }

        function checkWin() {
            const maxScore = 30;
            if (p1.score >= maxScore) {
                endPong("paprika");
            } else if (p2.score >= maxScore) {
                endPong("maci");
            }
        }

        function endPong(winner) {
            pongRunning = false;
            if (pongWinnerOverlay) {
                pongWinnerOverlay.style.display = "flex";
                if (winner === "maci") {
                    pongWinnerTitle.textContent = "TV Maci nyert!";
                    pongWinnerText.textContent = "Ügyes voltál! TV Maci szerezte meg a 30 pontot.";
                } else {
                    pongWinnerTitle.textContent = "Paprikajancsi nyert!";
                    pongWinnerText.textContent = "Most Paprikajancsi volt a gyorsabb!";
                }
            }
        }

        function updatePong() {
            if (!pongRunning) return;

            p1.y += p1.dy;
            p2.y += p2.dy;

            p1.y = Math.max(0, Math.min(pongCanvas.height - p1.h, p1.y));
            p2.y = Math.max(0, Math.min(pongCanvas.height - p2.h, p2.y));

            ball.x += ball.dx;
            ball.y += ball.dy;

            if (ball.y - ball.r < 0 || ball.y + ball.r > pongCanvas.height) {
                ball.dy *= -1;
            }

            if (
                ball.x - ball.r < p1.x + p1.w &&
                ball.y > p1.y &&
                ball.y < p1.y + p1.h &&
                ball.dx < 0
            ) {
                ball.dx *= -1.08;
                ball.dy *= 1.02;
                clampBallSpeed();
            }

            if (
                ball.x + ball.r > p2.x &&
                ball.y > p2.y &&
                ball.y < p2.y + p2.h &&
                ball.dx > 0
            ) {
                ball.dx *= -1.08;
                ball.dy *= 1.02;
                clampBallSpeed();
            }

            if (ball.x + ball.r < 0) {
                p2.score++;
                checkWin();
                resetBall(1);
            } else if (ball.x - ball.r > pongCanvas.width) {
                p1.score++;
                checkWin();
                resetBall(-1);
            }

            drawPong();
            requestAnimationFrame(updatePong);
        }

        resetBall(Math.random() < 0.5 ? -1 : 1);
        updatePong();

        function pongKeyDown(e) {
            if (!pongRunning) return;

            if (["ArrowUp", "ArrowDown"].includes(e.key)) {
                e.preventDefault();
            }

            if (e.key === "w") p1.dy = -5;
            if (e.key === "s") p1.dy = 5;

            if (e.key === "ArrowUp") p2.dy = -5;
            if (e.key === "ArrowDown") p2.dy = 5;
        }

        function pongKeyUp(e) {
            if (!pongRunning) return;

            if (e.key === "w" || e.key === "s") p1.dy = 0;
            if (e.key === "ArrowUp" || e.key === "ArrowDown") p2.dy = 0;
        }

        document.addEventListener("keydown", pongKeyDown);
        document.addEventListener("keyup", pongKeyUp);

        pongState.cleanup = () => {
            document.removeEventListener("keydown", pongKeyDown);
            document.removeEventListener("keyup", pongKeyUp);
        };
    }

    function resizeAllCanvas() {
        if (canvas) {
            if (window.innerWidth < 600) {
                canvas.width = 500;
                canvas.height = 200;
            } else {
                canvas.width = 800;
                canvas.height = 300;
            }
        }

        if (puzzleCanvas) {
            if (window.innerWidth < 600) {
                puzzleCanvas.width = 320;
                puzzleCanvas.height = 220;
            } else {
                puzzleCanvas.width = 600;
                puzzleCanvas.height = 400;
            }
            if (puzzleRunning) drawPuzzle();
        }

        if (pongCanvas) {
            if (window.innerWidth < 600) {
                pongCanvas.width = 320;
                pongCanvas.height = 220;
            } else {
                pongCanvas.width = 600;
                pongCanvas.height = 400;
            }
        }
    }

    resizeAllCanvas();
    window.addEventListener("resize", resizeAllCanvas);

    window.openPong = function () {
        showTransition(() => {
            hideAllPages();
            document.getElementById("pongContainer").style.display = "block";
            if (pongWinnerOverlay) pongWinnerOverlay.style.display = "none";
            startPong();
            window.scrollTo({ top: 0, behavior: "instant" });
        });
    };

    window.closePong = function () {
        pongRunning = false;
        if (pongState && pongState.cleanup) pongState.cleanup();
        document.getElementById("pongContainer").style.display = "none";
        document.getElementById("jatek").style.display = "block";
        if (pongWinnerOverlay) pongWinnerOverlay.style.display = "none";
        window.scrollTo({ top: 0, behavior: "instant" });
    };

    if (pongWinnerRestart) {
        pongWinnerRestart.addEventListener("click", () => {
            if (pongWinnerOverlay) pongWinnerOverlay.style.display = "none";
            document.getElementById("pongContainer").style.display = "block";
            startPong();
        });
    }

    function simulateKey(code, type) {
        document.dispatchEvent(new KeyboardEvent(type, { code, key: code }));
    }

    const jumpBtn = document.getElementById("btnJump");
    if (jumpBtn) {
        jumpBtn.addEventListener("touchstart", (e) => {
            e.preventDefault();
            simulateKey("Space", "keydown");
        }, { passive: false });

        jumpBtn.addEventListener("touchend", (e) => {
            e.preventDefault();
            simulateKey("Space", "keyup");
        }, { passive: false });
    }
});
