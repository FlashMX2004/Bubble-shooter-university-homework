window.onload = function () {
    let animation = false;

    // Timing and frames per second
    var lastframe = 0;
    var fpstime = 0;
    var framecount = 0;
    var fps = 0;

    // Elements
    let h1 = document.getElementsByTagName('h1')[0];
    let mainElem = document.getElementsByTagName('main')[0];
    let gridElem = document.getElementsByTagName('grid')[0];
    let playerElem = document.getElementsByTagName('player')[0];
    let playerArrow = document.getElementsByTagName('arrow')[0];
    let rows = gridElem.getElementsByTagName('row');
    let scoreElem = document.getElementById('score');

    // Calculate globals
    level.radius = parseInt(mainElem.getAttribute('bubble-collision-radius'));
    level.tilewidth = parseInt(mainElem.getAttribute('bubble-width'));
    level.tileheight = parseInt(mainElem.getAttribute('bubble-height'));
    level.rowheight = parseInt(gridElem.getAttribute('row-height'));
    level.columns = parseInt(gridElem.getAttribute('column-count'));
    level.rows = rows.length;
    level.width = level.columns * level.tilewidth + level.tilewidth / 2;
    player.width = level.width;
    player.height = playerElem.getBoundingClientRect().height;

    // Set width
    mainElem.style.width = level.width + 'px';

    // Cache rects
    mainRect = mainElem.getBoundingClientRect();
    playerRect = playerElem.getBoundingClientRect();

    // Init player
    playerElem.style.height = player.height + 'px';
    playerArrow.style.left = level.width / 2 + 'px';
    playerArrow.style.top = player.height / 2 + 'px';

    let playerBubble = document.createElement('bubble');
    let nextPlayerBubble = document.createElement('bubble');
    playerElem.appendChild(playerBubble);
    playerElem.appendChild(nextPlayerBubble);

    // Start game
    function startGame() {
        Core.initialize(parseInt(mainElem.getAttribute('bubble-colors')));
        Core.newGame();

        // Init grid
        for (let i = 0; i < Math.floor(level.rows / 2) ; i++) {
            for (let j = 0; j < level.columns; j++) {
                let bubble = document.createElement('bubble');
                bubble.style.left = level.tilewidth * j + 'px';
                if (Math.random() < 1.5) {
                    bubble.className = 'bubble-type-' + Math.floor(Math.random() * 3);
                } else {
                    bubble.className = 'bubble-type-4 drop';
                }
                rows[i].appendChild(bubble);
            }
        }

        updateTiles();
        updatePlayer();

        // Adding events listeners
        mainElem.addEventListener("mousemove", onMouseMove);
        mainElem.addEventListener("mousedown", onMouseDown);

        // Start main loop
        main(0);
    }

    // Main loop (onEnterFrame)
    function main(tframe) {
        // Request animation frames
        window.requestAnimationFrame(main);

        update(tframe);
    }

    function update(tframe) {
        var dt = (tframe - lastframe) / 1000;
        lastframe = tframe;

        // Update the fps counter
        updateFps(dt);

        if (gamestate == gamestates.ready) {
            // Game is ready for player input
        } else if (gamestate == gamestates.shootbubble) {
            // Bubble is moving
            Core.stateShootBubble(dt);
            movePlayer();
            if (gamestate != gamestates.shootbubble) {
                updateTiles();
                updatePlayer();
            }
        } else if (gamestate == gamestates.removecluster) {
            if (!animation) {
                Core.startRemoveCluster();
                startClustersAnimation();
                scoreElem.innerHTML = 'Score: ' + Core.score;
            }
        }
    }

    function updateFps(dt) {
        if (fpstime > 0.25) {
            // Calculate fps
            fps = Math.round(framecount / fpstime);

            // Reset time and framecount
            fpstime = 0;
            framecount = 0;
        }

        // Increase time and framecount
        fpstime += dt;
        framecount++;
    }

    function movePlayer() {
        playerBubble.style.left = player.bubble.x + 'px';
        playerBubble.style.top = player.bubble.y - playerRect.top + mainRect.top + 'px';
    }

    function updatePlayer() {
        playerBubble.style.left = level.width / 2 - level.tilewidth / 2 + 'px';
        playerBubble.style.top = player.height / 2 - level.tilewidth / 2 + 'px';
        playerBubble.className = 'bubble-type-' + player.bubble.tiletype;
        if (gamestate == gamestates.removecluster) playerBubble.style.display = 'none';
        else playerBubble.style.display = 'block';

        nextPlayerBubble.style.left = level.width / 2 - level.tilewidth * 4 + 'px';
        nextPlayerBubble.style.top = player.height / 2 - level.tilewidth / 2 + 'px';
        nextPlayerBubble.className = 'bubble-type-' + player.nextbubble.tiletype;
    }

    function updateTiles() {

        for (let r = 0; r < rows.length; r++) {
            if (r % 2 == Core.rowoffset)
                rows[r].style.left = '0px';
            else
                rows[r].style.left = level.tilewidth / 2 + 'px';

            while (rows[r].hasChildNodes()) rows[r].firstChild.remove();
        }

        for (let j = 0; j < level.rows; j++) {
            for (let i = 0; i < level.columns; i++) {
                // Get the tile
                let tile = level.tiles[i][j];

                // Check if there is a tile present
                if (tile.type >= 0) {
                    let bubble = document.createElement('bubble');
                    bubble.style.left = level.tilewidth * i + 'px';
                    bubble.className = 'bubble-type-' + tile.type;
                    bubble.setAttribute('x', i);
                    bubble.setAttribute('y', j);
                    rows[j].appendChild(bubble);
                }
            }
        }
    }

    function startClustersAnimation() {
        animation = true;

        // cluster
        for (let i = 0; i < Core.cluster.length; i++) {
            let tile = Core.cluster[i];
            let elem = getElement(tile.x, tile.y);
            elem.className += ' drop';
            tile.type = -1;
        }

        // floating clusters
        for (let i = 0; i < Core.floatingclusters.length; i++) {
            for (let j = 0; j < Core.floatingclusters[i].length; j++) {
                let tile = Core.floatingclusters[i][j];
                let elem = getElement(tile.x, tile.y);
                elem.className += ' drop-float';
                tile.type = -1;
            }
        }

        let tile = Core.cluster[0];
        getElement(tile.x, tile.y).addEventListener('animationend', onAnimationEnd, false);
    }

    function win() {
        //alert('You win!');
        localStorage.setItem('gameoverstate', 'win');
    }

    function lose() {
        //alert('You lose!');
        localStorage.setItem('gameoverstate', 'lose');
    }

    Core.onGameOver = function () {
        lose();
        localStorage.setItem('score', Core.score.toString());
        window.location.href = 'bubble-shooter-end.html';
    }

    function onAnimationEnd(e) {
        animation = false;

        // Next bubble
        Core.nextBubble();
        updateTiles();

        // Check for game over
        let tilefound = false
        for (let i = 0; i < level.columns; i++) {
            for (let j = 0; j < level.rows; j++) {
                if (level.tiles[i][j].type != -1) {
                    tilefound = true;
                    break;
                }
            }
        }

        if (tilefound) {
            Core.setGameState(gamestates.ready);
            updatePlayer();
        } else {
            // No tiles left, game over
            Core.setGameState(gamestates.gameover);
            win();
            localStorage.setItem('score', Core.score.toString());
            window.location.href = 'bubble-shooter-end.html';
        }
    }

    // On mouse movement
    function onMouseMove(e) {
        let rect = playerArrow.getBoundingClientRect();
        let x = e.clientX,
            y = e.clientY;

        // Get the mouse angle
        let mouseangle = radToDeg(Math.atan2(rect.top - y, x - rect.left));

        // Convert range to 0, 360 degrees
        if (mouseangle < 0) {
            mouseangle = 180 + (180 + mouseangle);
        }

        // Restrict angle to 8, 172 degrees
        let lbound = 8;
        let ubound = 172;
        if (mouseangle > 90 && mouseangle < 270) {
            // Left
            if (mouseangle > ubound) {
                mouseangle = ubound;
            }
        } else {
            // Right
            if (mouseangle < lbound || mouseangle >= 270) {
                mouseangle = lbound;
            }
        }

        player.angle = mouseangle;
        playerArrow.style.transform = `rotate(${-mouseangle + 90}deg)`;
    }

    // On mouse button click
    function onMouseDown(e) {
        if (gamestate == gamestates.ready) {
            Core.shootBubble();
        } else if (gamestate == gamestates.gameover) {
            Core.newGame();
        }
    }

    // Get element by tile x and y
    function getElement(x, y) {
        for (let n = 0; n < rows[y].childNodes.length; n++) {
            if (rows[y].childNodes[n].getAttribute('x') == x.toString()) return rows[y].childNodes[n]
        }
        return undefined;
    }

    // Let's play!
    startGame();
}