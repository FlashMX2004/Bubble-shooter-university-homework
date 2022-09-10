// Neighbor offset table
var neighborsoffsets = [[[1, 0], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1]], // Even row tiles
                        [[1, 0], [1, 1], [0, 1], [-1, 0], [0, -1], [1, -1]]];  // Odd row tiles

// Game states
var gamestates = { init: 0, ready: 1, shootbubble: 2, removecluster: 3, gameover: 4 };
var gamestate = gamestates.init;

// Level
var level = {
    x: 0,           // X position
    y: 0,          // Y position
    width: 0,       // Width, gets calculated
    height: 0,      // Height, gets calculated
    columns: 15,    // Number of tile columns
    rows: 14,       // Number of tile rows
    tilewidth: 40,  // Visual width of a tile
    tileheight: 40, // Visual height of a tile
    rowheight: 34,  // Height of a row
    radius: 20,     // Bubble collision radius
    tiles: []       // The two-dimensional tile array
};

// Player
var player = {
    x: 0,
    y: 0,
    angle: 0,
    tiletype: 0,
    bubble: {
        x: 0,
        y: 0,
        angle: 0,
        speed: 1000,
        dropspeed: 900,
        tiletype: 0,
        visible: false
    },
    nextbubble: {
        x: 0,
        y: 0,
        tiletype: 0
    }
};

// Define a tile class
var Tile = function (x, y, type, shift) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.removed = false;
    this.shift = shift;
    this.velocity = 0;
    this.alpha = 1;
    this.processed = false;
};

//
// The main container with all usability
//
var Core = {
    //
    // GENERAL
    //
    score: 0,
    turncounter: 0,
    rowoffset: 0,
    bubblecolors: 0,
    cluster: [],
    floatingclusters: [],
    onGameOver: function () {},

    // Initialize player, level, level tiles
    initialize: function (bubblecolors) {
        this.bubblecolors = bubblecolors;

        // Initialize the two-dimensional tile array
        for (let i = 0; i < level.columns; i++) {
            level.tiles[i] = [];
            for (var j = 0; j < level.rows; j++) {
                // Define a tile type and a shift parameter for animation
                level.tiles[i][j] = new Tile(i, j, 0, 0);
            }
        }
        // w x h
        level.width = level.columns * level.tilewidth + level.tilewidth / 2;
        level.height = (level.rows - 1) * level.rowheight + level.tileheight;

        // Init the player
        player.x = level.x + level.width / 2 - level.tilewidth / 2;
        player.y = level.y + level.height;
        player.angle = 90;
        player.tiletype = 0;

        player.nextbubble.x = player.x - 2 * level.tilewidth;
        player.nextbubble.y = player.y;
    },

    // Creates new level
    createLevel: function() {
        // Create a level with random tiles
        for (let j = 0; j < level.rows; j++) {
            let randomtile = randRange(0, this.bubblecolors - 1);
            let count = 0;
            for (let i = 0; i < level.columns; i++) {
                if (count >= 2) {
                    // Change the random tile
                    let newtile = randRange(0, this.bubblecolors - 1);

                    // Make sure the new tile is different from the previous tile
                    if (newtile == randomtile) {
                        newtile = (newtile + 1) % this.bubblecolors;
                    }
                    randomtile = newtile;
                    count = 0;
                }
                count++;

                if (j < level.rows / 2) {
                    level.tiles[i][j].type = randomtile;
                } else {
                    level.tiles[i][j].type = -1;
                }
            }
        }
    },

    // Set game state
    setGameState: function(state) {
        gamestate = state;
    },

    // New game
    newGame: function() {
        // Reset
        this.score = 0;
        this.turncounter = 0;
        this.rowoffset = 0;

        // Set the gamestate to ready
        this.setGameState(gamestates.ready);

        // Create the level
        this.createLevel();

        // Init the next bubble and set the current bubble
        this.nextBubble();
        this.nextBubble();
    },

    //
    // GAME FUNCS
    //

    // Check for game over
    checkGameOver: function () {
        for (let i = 0; i < level.columns; i++) {
            // Check if there are bubbles in the bottom row
            if (level.tiles[i][level.rows - 1].type != -1) {
                // Game over
                this.nextBubble();
                this.setGameState(gamestates.gameover);
                this.onGameOver();
                return true;
            }
        }

        return false;
    },

    // Add bubble row
    addBubbles: function () {
        // Move the rows downwards
        for (let i = 0; i < level.columns; i++) {
            for (let j = 0; j < level.rows - 1; j++) {
                level.tiles[i][level.rows - 1 - j].type = level.tiles[i][level.rows - 1 - j - 1].type;
            }
        }

        // Add a new row of bubbles at the top
        for (let i = 0; i < level.columns; i++) {
            // Add random, existing, colors
            level.tiles[i][0].type = this.getExistingColor();
        }
    },

    // Next bubble for player
    nextBubble: function(){
        // Set the current bubble
        player.tiletype = player.nextbubble.tiletype;
        player.bubble.tiletype = player.nextbubble.tiletype;
        player.bubble.x = player.x;
        player.bubble.y = player.y;
        player.bubble.visible = true;

        // Get a random type from the existing colors
        let nextcolor = this.getExistingColor();

        // Set the next bubble
        player.nextbubble.tiletype = nextcolor;
    },

    // Shoot the bubble and sets gamestate like "shootbubble"
    shootBubble: function () {
        // Shoot the bubble in the direction of the mouse
        player.bubble.x = player.x;
        player.bubble.y = player.y;
        player.bubble.angle = player.angle;
        player.bubble.tiletype = player.tiletype;

        // Set the gamestate
        this.setGameState(gamestates.shootbubble);
    },

    // Snap bubble to the grid.
    // if found cluster, sets gamestate like "removecluster"
    // else sets gamestate like "ready"
    snapBubble: function() {
        // Get the grid position
        let centerx = player.bubble.x + level.tilewidth / 2;
        let centery = player.bubble.y + level.tileheight / 2;
        let gridpos = this.getGridPosition(centerx, centery);

        // Make sure the grid position is valid
        if (gridpos.x < 0) {
            gridpos.x = 0;
        }

        if (gridpos.x >= level.columns) {
            gridpos.x = level.columns - 1;
        }

        if (gridpos.y < 0) {
            gridpos.y = 0;
        }

        if (gridpos.y >= level.rows) {
            gridpos.y = level.rows - 1;
        }

        // Check if the tile is empty
        let addtile = false;
        if (level.tiles[gridpos.x][gridpos.y].type != -1) {
            // Tile is not empty, shift the new tile downwards
            for (let newrow = gridpos.y + 1; newrow < level.rows; newrow++) {
                if (level.tiles[gridpos.x][newrow].type == -1) {
                    gridpos.y = newrow;
                    addtile = true;
                    break;
                }
            }
        } else {
            addtile = true;
        }

        // Add the tile to the grid
        if (addtile) {
            // Hide the player bubble
            player.bubble.visible = false;

            // Set the tile
            level.tiles[gridpos.x][gridpos.y].type = player.bubble.tiletype;

            // Check for game over
            if (this.checkGameOver()) {
                return;
            }

            // Find clusters
            this.cluster = this.findCluster(gridpos.x, gridpos.y, true, true, false);

            if (this.cluster.length >= 3) {
                // Remove the cluster
                this.setGameState(gamestates.removecluster);
                return;
            }
        }

        // No clusters found
        this.turncounter++;
        if (this.turncounter >= 5) {
            // Add a row of bubbles
            this.addBubbles();
            this.turncounter = 0;
            this.rowoffset = (this.rowoffset + 1) % 2;

            if (this.checkGameOver()) {
                return;
            }
        }

        // Next bubble
        this.nextBubble();
        this.setGameState(gamestates.ready);
    },

    startRemoveCluster: function() {
        this.resetRemoved();

        // Mark the tiles as removed
        for (let i = 0; i < this.cluster.length; i++) {
            // Set the removed flag
            this.cluster[i].removed = true;
        }

        // Add cluster score
        this.score += this.cluster.length * 100;

        // Find floating clusters
        this.floatingclusters = this.findFloatingClusters();

        if (this.floatingclusters.length > 0) {
            // Setup drop animation
            for (let i = 0; i < this.floatingclusters.length; i++) {
                for (let j = 0; j < this.floatingclusters[i].length; j++) {
                    let tile = this.floatingclusters[i][j];
                    tile.shift = 0;
                    tile.shift = 1;
                    tile.velocity = player.bubble.dropspeed;

                    this.score += 100;
                }
            }
        }
    },

    //
    // STATES BY TIME *(dt)
    //

    stateShootBubble: function (dt) {
        // Bubble is moving
        
        // Move the bubble in the direction of the mouse
        player.bubble.x += dt * player.bubble.speed * Math.cos(degToRad(player.bubble.angle));
        player.bubble.y += dt * player.bubble.speed * -1*Math.sin(degToRad(player.bubble.angle));
        
        // Handle left and right collisions with the level
        if (player.bubble.x <= level.x) {
            // Left edge
            player.bubble.angle = 180 - player.bubble.angle;
            player.bubble.x = level.x;
        } else if (player.bubble.x + level.tilewidth >= level.x + level.width) {
            // Right edge
            player.bubble.angle = 180 - player.bubble.angle;
            player.bubble.x = level.x + level.width - level.tilewidth;
        }
 
        // Collisions with the top of the level
        if (player.bubble.y <= level.y) {
            // Top collision
            player.bubble.y = level.y;
            this.snapBubble();
            return;
        }
        
        // Collisions with other tiles
        for (let i = 0; i < level.columns; i++) {
            for (let j = 0; j < level.rows; j++) {
                let tile = level.tiles[i][j];
                
                // Skip empty tiles
                if (tile.type < 0) {
                    continue;
                }
                
                // Check for intersections
                let coord = this.getTileCoordinate(i, j);
                if (circleIntersection(player.bubble.x + level.tilewidth/2,
                                       player.bubble.y + level.tileheight/2,
                                       level.radius,
                                       coord.tilex + level.tilewidth/2,
                                       coord.tiley + level.tileheight/2,
                                       level.radius)) {
                                        
                    // Intersection with a level bubble
                    this.snapBubble();
                    return;
                }
            }
        }
    },

    //
    // HELPERS
    //

    // Find the remaining colors
    findColors: function () {
        let foundcolors = [];
        let colortable = [];
        for (let i = 0; i < this.bubblecolors; i++) {
            colortable.push(false);
        }

        // Check all tiles
        for (let i = 0; i < level.columns; i++) {
            for (let j = 0; j < level.rows; j++) {
                let tile = level.tiles[i][j];
                if (tile.type >= 0) {
                    if (!colortable[tile.type]) {
                        colortable[tile.type] = true;
                        foundcolors.push(tile.type);
                    }
                }
            }
        }

        return foundcolors;
    },

    // Get a random existing color
    getExistingColor: function () {
        let existingcolors = this.findColors();

        let bubbletype = 0;
        if (existingcolors.length > 0) {
            bubbletype = existingcolors[randRange(0, existingcolors.length - 1)];
        }

        return bubbletype;
    },

    // Get the tile coordinate
    getTileCoordinate: function (column, row) {
        let tilex = level.x + column * level.tilewidth;

        // X offset for odd or even rows
        if ((row + this.rowoffset) % 2) {
            tilex += level.tilewidth / 2;
        }

        let tiley = level.y + row * level.rowheight;
        return { tilex: tilex, tiley: tiley };
    },

    // Get the closest grid position
    getGridPosition: function (x, y) {
        let gridy = Math.floor((y - level.y) / level.rowheight);

        // Check for offset
        let xoffset = 0;
        if ((gridy + this.rowoffset) % 2) {
            xoffset = level.tilewidth / 2;
        }
        var gridx = Math.floor(((x - xoffset) - level.x) / level.tilewidth);

        return { x: gridx, y: gridy };
    },

    // Get the neighbors of the specified tile
    getNeighbors: function(tile) {
        var tilerow = (tile.y + this.rowoffset) % 2; // Even or odd row
        var neighbors = [];
        
        // Get the neighbor offsets for the specified tile
        var n = neighborsoffsets[tilerow];
        
        // Get the neighbors
        for (var i=0; i<n.length; i++) {
            // Neighbor coordinate
            var nx = tile.x + n[i][0];
            var ny = tile.y + n[i][1];
            
            // Make sure the tile is valid
            if (nx >= 0 && nx < level.columns && ny >= 0 && ny < level.rows) {
                neighbors.push(level.tiles[nx][ny]);
            }
        }
        
        return neighbors;
    },

    // Reset the processed flags
    resetProcessed: function() {
        for (let i=0; i<level.columns; i++) {
            for (let j=0; j<level.rows; j++) {
                level.tiles[i][j].processed = false;
            }
        }
    },

    // Reset the removed flags
    resetRemoved: function() {
        for (let i=0; i<level.columns; i++) {
            for (let j=0; j<level.rows; j++) {
                level.tiles[i][j].removed = false;
            }
        }
    },

    // Find cluster at the specified tile location
    findCluster: function (tx, ty, matchtype, reset, skipremoved) {
        // Reset the processed flags
        if (reset) {
            this.resetProcessed();
        }
        
        // Get the target tile. Tile coord must be valid.
        let targettile = level.tiles[tx][ty];
        
        // Initialize the toprocess array with the specified tile
        let toprocess = [targettile];
        targettile.processed = true;
        let foundcluster = [];

        while (toprocess.length > 0) {
            // Pop the last element from the array
            let currenttile = toprocess.pop();
            
            // Skip processed and empty tiles
            if (currenttile.type == -1) {
                continue;
            }
            
            // Skip tiles with the removed flag
            if (skipremoved && currenttile.removed) {
                continue;
            }
            
            // Check if current tile has the right type, if matchtype is true
            if (!matchtype || (currenttile.type == targettile.type)) {
                // Add current tile to the cluster
                foundcluster.push(currenttile);
                
                // Get the neighbors of the current tile
                let neighbors = this.getNeighbors(currenttile);
                
                // Check the type of each neighbor
                for (let i = 0; i < neighbors.length; i++) {
                    if (!neighbors[i].processed) {
                        // Add the neighbor to the toprocess array
                        toprocess.push(neighbors[i]);
                        neighbors[i].processed = true;
                    }
                }
            }
        }
        
        // Return the found cluster
        return foundcluster;
    },

    // Find floating clusters
    findFloatingClusters: function () {
        // Reset the processed flags
        this.resetProcessed();
        
        let foundclusters = [];
        
        // Check all tiles
        for (let i = 0; i < level.columns; i++) {
            for (let j = 0; j < level.rows; j++) {
                let tile = level.tiles[i][j];
                if (!tile.processed) {
                    // Find all attached tiles
                    let foundcluster = this.findCluster(i, j, false, false, true);
                    
                    // There must be a tile in the cluster
                    if (foundcluster.length <= 0) {
                        continue;
                    }
                    
                    // Check if the cluster is floating
                    let floating = true;
                    for (let k = 0; k < foundcluster.length; k++) {
                        if (foundcluster[k].y == 0) {
                            // Tile is attached to the roof
                            floating = false;
                            break;
                        }
                    }
                    
                    if (floating) {
                        // Found a floating cluster
                        foundclusters.push(foundcluster);
                    }
                }
            }
        }
        
        return foundclusters;
    }
}


//
// GLOBAL HELPERS
//

// Convert radians to degrees
function radToDeg(angle) { return angle * (180 / Math.PI) }

// Convert degrees to radians
function degToRad(angle) { return angle * (Math.PI / 180) }

// Get a random int between low and high, inclusive
function randRange(low, high) { return Math.floor(low + Math.random() * (high - low + 1)) }

// Check if two circles intersect
function circleIntersection(x1, y1, r1, x2, y2, r2) {
    // Calculate the distance between the centers
    let dx = x1 - x2;
    let dy = y1 - y2;
    let len = Math.sqrt(dx * dx + dy * dy);

    if (len < r1 + r2) {
        // Circles intersect
        return true;
    }

    return false;
}