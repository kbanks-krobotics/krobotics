      // Douglas Crockford JavaScript: The Good Parts chapter 3 page 22
      if (typeof Object.create !== 'function') {
        Object.create = function(o) {
          var F = function() {};
          F.prototype = o;
          return new F();
        }
      }; 


      EMPTY_SECTOR = ' . ';
      TORPEDO = ' + ';
      KLINGON = ' >-';
      ENTERPRISE = ']O ';
      STAR = ' * ';
      STARBASE = '(O)';

      NUM_GALAXY_ROWS = 10;

      NUM_GALAXY_COLS = 10;

      NUM_QUADRANT_ROWS = 10;

      NUM_QUADRANT_COLS = 10;

      ENERGY_TO_MOVE_SECTOR = 10;
      ENERGY_TO_MOVE_QUADRANT = 100;

      var row;
      var col;
      var id;

      var galaxy;
      var quadrant;

      var ship =
      {
        quadrantRow : 0,
        quadrantCol : 0,
        sectorRow : 0,
        sectorCol : 0,
        energy : 0,
        shields : 0,
        torpedos : 0,
        warpDeltaX : 0,
        warpDeltaY : 0,
        impulseDeltaX : 0,
        impulseDeltaY : 0
      };

      var torpedo =
      {
        sectorRow : 0,
        sectorCol : 0,
        impulseDeltaX : 0,
        impulseDeltaY : 0
      };

      var player = Object.create(ship);
      var enemies = [];
      var torpedos = [];

      var tickId = -1;

      var tickCounter = 0;
      var TICK_LIMIT = 10;


      // returns a random value between 0 and n-1
      function random0(n)
      {
        return Math.floor( Math.random() * n );
      }

      function generateRandomQuadrant(row, col)
      {
        var klingons, starbases, stars, result;
        result = '';

        // 0-9 Klingons
        klingons = random0(10);

        // 10% chance of a starbase
        if ( Math.random() < 0.1 )
        {
          starbases = 1;
        }
        else
        {
          starbases = 0;
        }

        // 0-5 stars
        stars = random0(6);

        return result + klingons + starbases + stars;
      }

      function unhideQuadrant(row, col)
      {
        temp = galaxy[row][col];
        if (temp[0] === '-')
        {
          temp = temp.substring(1,temp.length);
          galaxy[row][col] = temp;
        }
        // else already visible...
      }


      // Used at the beginning of the game, plus whenever spacedock achieved
      function replenishPlayer()
      {
        player.energy = 9999;
        player.shields = 0;
        player.torpedos = 10;
      }

      function initGalaxy()
      {
        galaxy = new Array(NUM_GALAXY_ROWS);
        for (row = 0; row < galaxy.length; row++)
        {
          galaxy[row] = new Array(NUM_GALAXY_COLS);
          for (col = 0; col < galaxy[row].length; col++ )
          {

            // The negation means "hidden from player"
            galaxy[row][col] = '-' + generateRandomQuadrant(row, col);
          }
        }
      } 


      function placeItem(what)
      {
        notDone = true;
        do
        {
          row = random0(NUM_QUADRANT_ROWS);
          col = random0(NUM_QUADRANT_COLS);
          if (quadrant[row][col] == EMPTY_SECTOR)
          {
            quadrant[row][col] = what;
            notDone = false;
          }
        } while (notDone);
        if (what === ENTERPRISE)
        {
          player.sectorRow = row;
          player.sectorCol = col;
        }
        else if (what === KLINGON)
        {
          var klingon = Object.create(ship);
          klingon.sectorRow = row;
          klingon.sectorCol = col;

          // Thought it would be fun to create some random motion
          klingon.impulseDeltaY = random0(3)-1;
          klingon.impulseDeltaX = random0(3)-1;

          enemies[enemies.length] = klingon;
        }
      }

      function addTorpedo(row, col, rowDelta, colDelta)
      {
        newRow = row + rowDelta;
        newCol = col + colDelta;

        // Cannot launch torpedos outside the current quadrant
        if ((newRow < 0) ||
            (newRow >= NUM_QUADRANT_ROWS) ||
            (newCol < 0) ||
            (newCol >= NUM_QUADRANT_ROWS))
        {
          return;
        }

        if (quadrant[newRow][newCol] != EMPTY_SECTOR)
        {
          // TODO Penalize?
          return;
        }

        quadrant[newRow][newCol] = TORPEDO;
        showSrs();

        var instance = Object.create(torpedo);

        instance.sectorRow = newRow;
        instance.sectorCol = newCol;
        instance.impulseDeltaX = colDelta;
        instance.impulseDeltaY = rowDelta;

        torpedos[torpedos.length] = instance;
      }

      function moveTorpedos()
      {
        if (torpedos.length == 0)
        {
          return;
        }

        index = 0;
        while (index < torpedos.length)
        {
          instance = torpedos[index];

          if (tryQuadrantMove(TORPEDO,
                              instance.sectorRow, instance.sectorCol,
                              instance.impulseDeltaY, instance.impulseDeltaX))
          {
            instance.sectorRow += instance.impulseDeltaY;
            instance.sectorCol += instance.impulseDeltaX;
            index += 1;
          }
          else
          {
            // Just make it vanish for tonight (no damage)

            quadrant[instance.sectorRow][instance.sectorCol] = EMPTY_SECTOR;

            instance = torpedos.pop(); // get the LAST one (possible the same one we are already working with)

            if (index < torpedos.length)
            {
              torpedos[index] = instance; // overwrite the current one with the last one
            } 
          }
        }
        showSrs(); // make the torpedo changes visible
      }


      function moveKlingons()
      {
        if (enemies.length == 0)
        {
          return;
        }

        index = 0;
        while (index < enemies.length)
        {
          instance = enemies[index];

          if (tryQuadrantMove(KLINGON,
                              instance.sectorRow, instance.sectorCol,
                              instance.impulseDeltaY, instance.impulseDeltaX))
          {
            instance.sectorRow += instance.impulseDeltaY;
            instance.sectorCol += instance.impulseDeltaX;
          }
          else
          {
            // Just make them bounce around for tonight
            instance.impulseDeltaY *= -1;
            instance.impulseDeltaX *= -1;
          }
          index += 1;
        }
        showSrs(); // make the torpedo changes visible
      }


      function initQuadrant(sectorCode)
      {
        quadrant = new Array(NUM_QUADRANT_ROWS);
        for (row = 0; row < quadrant.length; row++)
        {
          quadrant[row] = new Array(NUM_QUADRANT_COLS);
          for (col = 0; col < quadrant[row].length; col++ )
          {
            quadrant[row][col] = EMPTY_SECTOR;
          }
        }

        // Place Klingons
        enemies = [];

        klingons = parseInt(sectorCode[0]);
        while (klingons > 0)
        {
          placeItem(KLINGON);
          klingons -= 1;
        }


        // Place Starbases
        starbases = parseInt(sectorCode[1]);
        while (starbases > 0)
        {
          placeItem(STARBASE);
          starbases -= 1;
        }

        // Place Stars
        stars = parseInt(sectorCode[2]);
        while (stars > 0)
        {
          placeItem(STAR);
          stars -= 1;
        }

        // Place player
        placeItem(ENTERPRISE);
      } 

      function showMap()
      {
        for (row = 0; row < galaxy.length; row++)
        {
          for (col = 0; col < galaxy[row].length; col++ )
          {
            id = 'map' + row + col;
            str = galaxy[row][col];
            if (str[0] === '-')
            {
              document.getElementById( id ).innerHTML = '???';
            }
            else
            {
              document.getElementById( id ).innerHTML = str;
            }
          }
        } 
      }

      function showLrs()
      {
        for (rowOffset = -1; rowOffset <=1; rowOffset++)
        {
          for (colOffset = -1; colOffset <= 1; colOffset++ )
          {
            // in bounds?
            row = player.quadrantRow + rowOffset;
            col = player.quadrantCol + colOffset;

            id = 'lrs' + (rowOffset+1) + (colOffset+1);

            if ((row < 0) || (row >= NUM_GALAXY_ROWS) ||
                (col < 0) || (col >= NUM_GALAXY_COLS))
            {
              document.getElementById( id ).innerHTML = '---';
            }
            else
            {
              str = galaxy[row][col];
              if (str[0] === '-')
              {
                document.getElementById( id ).innerHTML = '???';
              }
              else
              {
                document.getElementById( id ).innerHTML = str;
              }
            }
          }
        } 
      }

      function updateLrs()
      {
        for (rowOffset = -1; rowOffset <=1; rowOffset++)
        {
          for (colOffset = -1; colOffset <= 1; colOffset++ )
          {
            // in bounds?
            row = player.quadrantRow + rowOffset;
            col = player.quadrantCol + colOffset;

            if ((row >= 0) && (row < NUM_GALAXY_ROWS) &&
                (col >= 0) && (col < NUM_GALAXY_COLS))
            {
              unhideQuadrant(row, col);
            }
          }
        } 
      }

      function showSrs()
      {
        for (row = 0; row < quadrant.length; row++)
        {
          for (col = 0; col < quadrant[row].length; col++ )
          {
            id = 'srs' + row + col;
            str = quadrant[row][col];
            document.getElementById( id ).innerHTML = str;
          }
        } 
      }

      function showStatus()
      {
        str = player.quadrantRow + '-' + player.quadrantCol;
        document.getElementById( 'quadrant' ).innerHTML = str;

        str = player.sectorRow + '-' + player.sectorCol;
        document.getElementById( 'sector' ).innerHTML = str;

        str = '000' + player.energy;
        str = str.slice(str.length-4, str.length);
        document.getElementById( 'energy' ).innerHTML = str;

        str = '000' + player.shields;
        str = str.slice(str.length-4, str.length);
        document.getElementById( 'shields' ).innerHTML = str;

        str = '' + player.torpedos;
        document.getElementById( 'torpedos' ).innerHTML = str;
      }


      function tryQuadrantMove(what, row, col, rowDelta, colDelta)
      {
        newRow = row + rowDelta;
        newCol = col + colDelta;

        // For now I choose to disallow movement out of the current sector
        // via impulse engines (use warp drive instead)
        if ((newRow < 0) ||
            (newRow >= NUM_QUADRANT_ROWS) ||
            (newCol < 0) ||
            (newCol >= NUM_QUADRANT_ROWS))
        {
          return false;
        }

        if (quadrant[newRow][newCol] === EMPTY_SECTOR)
        {
          quadrant[row][col] = EMPTY_SECTOR;
          quadrant[newRow][newCol] = what;

          showSrs();
          return true;
        }
        else
        {
          return false;
        }
      }


      function tryGalaxyMove(what, row, col, rowDelta, colDelta)
      {
        newRow = row + rowDelta;
        newCol = col + colDelta;

        // For now I choose to disallow movement out of the galaxy
        // (may institute wrap-around later)
        if ((newRow < 0) ||
            (newRow >= NUM_GALAXY_ROWS) ||
            (newCol < 0) ||
            (newCol >= NUM_GALAXY_ROWS))
        {
          return false;
        }

        // Currently no other restrictions
        return true;
      }

      function informPlayer(message_text)
      {
        document.getElementById( 'message' ).innerHTML = message_text;
      }

      function timerTick()
      {
        tickId = setTimeout(timerTick, 100);

        // Fast processing
        moveTorpedos();


        tickCounter += 1;
        if (tickCounter < TICK_LIMIT)
        {
          return;
        }
        else
        {
          tickCounter = 0;
        }


        // Slow processing

        moveKlingons();

        if (player.energy > 0)
        {
          player.energy -= 1;

          // Check for impulse engines
          if ((player.energy > ENERGY_TO_MOVE_SECTOR) &&
              ((player.impulseDeltaX != 0) || (player.impulseDeltaY != 0)))
          {
            // You pay the movement cost even if you hit something...
            player.energy -= ENERGY_TO_MOVE_SECTOR;

            if (tryQuadrantMove(ENTERPRISE,
                                player.sectorRow, player.sectorCol,
                                player.impulseDeltaY, player.impulseDeltaX))
            {
              player.sectorRow += player.impulseDeltaY;
              player.sectorCol += player.impulseDeltaX;
            }
          }

          // else check for warp drive
          else if ((player.energy > ENERGY_TO_MOVE_QUADRANT) &&
              ((player.warpDeltaX != 0) || (player.warpDeltaY != 0)))
          {
            // You pay the movement cost even if you hit something...
            player.energy -= ENERGY_TO_MOVE_QUADRANT;

            if (tryGalaxyMove(ENTERPRISE,
                              player.quadrantRow, player.quadrantCol,
                              player.warpDeltaY, player.warpDeltaX))
            {
              player.quadrantRow += player.warpDeltaY;
              player.quadrantCol += player.warpDeltaX;

              enterNewQuadrant();
            }
          }
          showStatus();
        }
        else // energy <= 0
        {
          informPlayer('You have run out of energy! Game Over.');
          // Notice we did NOT schedule the next timer tick in this case
        }
      }

      function enterNewQuadrant()
      {
        // Unhide the quadrant the player is in
        unhideQuadrant(player.quadrantRow, player.quadrantCol);

        showMap();

        showLrs();

        initQuadrant(galaxy[player.quadrantRow][player.quadrantCol]);

        showSrs();

        showStatus();
      }

      function newGame()
      {
        initGalaxy();

        player.quadrantRow = random0(NUM_GALAXY_ROWS);
        player.quadrantCol = random0(NUM_GALAXY_COLS);

        player.warpDeltaX = 0;
        player.warpDeltaY = 0;
        player.impulseDeltaX = 0;
        player.impulseDeltaY = 0;

        replenishPlayer();

        enterNewQuadrant();

        informPlayer('Good luck captain!');

        // This extra check is to handle user hitting new game in the middle of a game
        if (tickId != -1)
        {
          clearTimeout(tickId);
        }
        tickId = setTimeout(timerTick, 100);
      }

      function impulseHandler(cmd)
      {
        // Impulse engines cancels warp drive
        player.warpDeltaX = 0;
        player.warpDeltaY = 0;
        switch (cmd)
        {
          case 'up-left':
            player.impulseDeltaX = -1;
            player.impulseDeltaY = -1;
          break;
          case 'up':
            player.impulseDeltaX = 0;
            player.impulseDeltaY = -1;
          break;
          case 'up-right':
            player.impulseDeltaX = +1;
            player.impulseDeltaY = -1;
          break;
          case 'left':
            player.impulseDeltaX = -1;
            player.impulseDeltaY = 0;
          break;
          case 'stop':
            player.impulseDeltaX = 0;
            player.impulseDeltaY = 0;
          break;
          case 'right':
            player.impulseDeltaX = +1;
            player.impulseDeltaY = 0;
          break;
          case 'down-left':
            player.impulseDeltaX = -1;
            player.impulseDeltaY = +1;
          break;
          case 'down':
            player.impulseDeltaX = 0;
            player.impulseDeltaY = +1;
          break;
          case 'down-right':
            player.impulseDeltaX = +1;
            player.impulseDeltaY = +1;
          break;
        }
      }

      function warpHandler(cmd)
      {
        // Warp drive cancels impulse engines
        player.impulseDeltaX = 0;
        player.impulseDeltaY = 0;
        switch (cmd)
        {
          case 'up-left':
            player.warpDeltaX = -1;
            player.warpDeltaY = -1;
          break;
          case 'up':
            player.warpDeltaX = 0;
            player.warpDeltaY = -1;
          break;
          case 'up-right':
            player.warpDeltaX = +1;
            player.warpDeltaY = -1;
          break;
          case 'left':
            player.warpDeltaX = -1;
            player.warpDeltaY = 0;
          break;
          case 'stop':
            player.warpDeltaX = 0;
            player.warpDeltaY = 0;
          break;
          case 'right':
            player.warpDeltaX = +1;
            player.warpDeltaY = 0;
          break;
          case 'down-left':
            player.warpDeltaX = -1;
            player.warpDeltaY = +1;
          break;
          case 'down':
            player.warpDeltaX = 0;
            player.warpDeltaY = +1;
          break;
          case 'down-right':
            player.warpDeltaX = +1;
            player.warpDeltaY = +1;
          break;
        }
      }

      function torpedoHandler(cmd)
      {
        if (player.torpedos <= 0)
        {
          return;
        }

        switch (cmd)
        {
          case 'up-left':
            addTorpedo(player.sectorRow, player.sectorCol, -1, -1)
          break;
          case 'up':
            addTorpedo(player.sectorRow, player.sectorCol, -1, 0)
          break;
          case 'up-right':
            addTorpedo(player.sectorRow, player.sectorCol, -1, +1)
          break;
          case 'left':
            addTorpedo(player.sectorRow, player.sectorCol, 0, -1)
          break;
          case 'stop':
          break;
          case 'right':
            addTorpedo(player.sectorRow, player.sectorCol, 0, +1)
          break;
          case 'down-left':
            addTorpedo(player.sectorRow, player.sectorCol, +1, -1)
          break;
          case 'down':
            addTorpedo(player.sectorRow, player.sectorCol, +1, 0)
          break;
          case 'down-right':
            addTorpedo(player.sectorRow, player.sectorCol, +1, +1)
          break;
        }

        player.torpedos -= 1;
        showStatus();

      }

      function longRangeScan()
      {
        updateLrs();
        showLrs();
        showMap();
      }

      function attemptDocking()
      {
        dockSuccessful = false;

        // Is there any starbase to dock with?
        if (galaxy[player.quadrantRow][player.quadrantCol][1] === '0')
        {
          informPlayer('No starbase in this quadrant to dock with!');
          return;
        }

        if ((player.warpDeltaX != 0) || (player.warpDeltaY != 0))
        {
          informPlayer('Warp drive must be disengaged before attempting space dock!');
          // TODO Penalize player?
          return;
        }

        if ((player.impulseDeltaX != 0) || (player.impulseDeltaY != 0))
        {
          informPlayer('Impulse engines must be at full stop before attempting space dock!');
          // TODO Penalize player?
          return;
        }


        //
        // Arbitrary gameplay decision - you can only dock from directly above or below
        //

        // IS there a row above us?
        if (player.sectorRow > 0)
        {
          // Is there a starbase there?
          if (quadrant[player.sectorRow - 1][player.sectorCol] === STARBASE)
          {
            dockSuccessful = true;
          }
        }
        // IS there a row below us?
        if (player.sectorRow < 9)
        {
          if (quadrant[player.sectorRow + 1][player.sectorCol] === STARBASE)
          {
            dockSuccessful = true;
          }
        }

        if (dockSuccessful)
        {
          informPlayer('Docking with starbase successful!');
          replenishPlayer();
          showStatus();
        }
        else
        {
          informPlayer('Must maneuver into docking range (above or below starbase)');
        }
      }
