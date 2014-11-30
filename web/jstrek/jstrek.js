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
      //TORPEDO_DAMAGE = 10000; // more than enough to kill for now, may weaken later
      //TORPEDO_DAMAGE = 5000; // two hits to kill
      TORPEDO_DAMAGE = 3000;


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
        energy : 9999, // seemed convenient to go ahead and start with a full tank...
        shields : 0,
        torpedos : 10, // and ammo...
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

      var ships = [];
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
        ships[0].energy = 9999;
        ships[0].shields = 0;
        ships[0].torpedos = 99; //10;
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
          if (quadrant[row][col] === EMPTY_SECTOR)
          {
            quadrant[row][col] = what;
            notDone = false;
          }
        } while (notDone);
        if (what === ENTERPRISE)
        {
          ships[0].sectorRow = row;
          ships[0].sectorCol = col;
        }
        else if (what === KLINGON)
        {
          var klingon = Object.create(ship);
          klingon.sectorRow = row;
          klingon.sectorCol = col;

          // Thought it would be fun to create some random motion
          klingon.impulseDeltaY = random0(3)-1;
          klingon.impulseDeltaX = random0(3)-1;

          ships[ships.length] = klingon;
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
            (newCol >= NUM_QUADRANT_COLS))
        {
          // TODO Penalize?
          return;
        }

        if (quadrant[newRow][newCol] !== EMPTY_SECTOR)
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

      function applyDamage(row, col, amount)
      {
        var instance;
        var index = 0;
        while (index < ships.length)
        {
          instance = ships[index];
          if ((instance.sectorRow === row) && (instance.sectorCol === col))
          {
            if (instance.energy >= amount)
            {
              instance.energy -= amount;
            }
            else
            {
              instance.energy = 0;
            }

            if (index === 0)
            {
              informPlayer("" + amount + " unit hit on player ship!" );
            }
            else
            {
              informPlayer("" + amount + " unit hit on ship at sector " + row + ", " + col);

              if (instance.energy === 0)
              {
                informPlayer("Enemy ship destroyed");

                quadrant[row][col] = EMPTY_SECTOR; // Future idea - leave debris?

                instance = ships.pop(); // get the LAST one (possible the same one we are already working with)

                if (index < ships.length)
                {
                  ships[index] = instance; // overwrite the current one with the last one
                } 

                // One less enemy in this part of the universe
                temp = galaxy[ships[0].quadrantRow][ships[0].quadrantCol];

                count = temp.charCodeAt(0);
                count -= 1;
                temp = String.fromCharCode(count) + temp[1] + temp[2];

                galaxy[ships[0].quadrantRow][ships[0].quadrantCol] = temp;

                showMap();
                showLrs();
              }

            }

            return;
          }
          index++;
        }
      }

      function moveTorpedos()
      {
        var instance;
        var index = 0;
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
            applyDamage(instance.sectorRow + instance.impulseDeltaY, instance.sectorCol + instance.impulseDeltaX, TORPEDO_DAMAGE);

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


      function klingonFire(instance)
      {
        if (instance.torpedos === 0)
        {
          return;
        }

        if (instance.sectorRow === ships[0].sectorRow)
        {
          if (instance.sectorCol > ships[0].sectorCol)
          {
            addTorpedo(instance.sectorRow, instance.sectorCol, 0, -1);
          }
          else
          {
            addTorpedo(instance.sectorRow, instance.sectorCol, 0, +1);
          }
          instance.torpedos -= 1;
        }
        else if (instance.sectorCol === ships[0].sectorCol)
        {
          if (instance.sectorRow > ships[0].sectorRow)
          {
            addTorpedo(instance.sectorRow, instance.sectorCol, -1, 0);
          }
          else
          {
            addTorpedo(instance.sectorRow, instance.sectorCol, +1, 0);
          }
          instance.torpedos -= 1;
        }
      }

      function moveKlingons()
      {
        // ships[0] is the player, not a klingon
        if (ships.length === 1)
        {
          return;
        }

        index = 1;
        while (index < ships.length)
        {
          instance = ships[index];

          // Temp experiment
          klingonFire(instance);

          // Only try to move if there is sufficient energy
          if (instance.energy > ENERGY_TO_MOVE_SECTOR)
          {
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
            instance.energy -= ENERGY_TO_MOVE_SECTOR;
          }
          index += 1;
        }
        showSrs(); // make the klingon movement visible
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

        // Clear out any Klingons left in the ships array from a previous quadrant
        ships.splice(1, ships.length-1);

        // Place Klingons
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
            row = ships[0].quadrantRow + rowOffset;
            col = ships[0].quadrantCol + colOffset;

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
            row = ships[0].quadrantRow + rowOffset;
            col = ships[0].quadrantCol + colOffset;

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
        str = ships[0].quadrantRow + '-' + ships[0].quadrantCol;
        document.getElementById( 'quadrant' ).innerHTML = str;

        str = ships[0].sectorRow + '-' + ships[0].sectorCol;
        document.getElementById( 'sector' ).innerHTML = str;

        str = '000' + ships[0].energy;
        str = str.slice(str.length-4, str.length);
        document.getElementById( 'energy' ).innerHTML = str;

        str = '000' + ships[0].shields;
        str = str.slice(str.length-4, str.length);
        document.getElementById( 'shields' ).innerHTML = str;

        str = '' + ships[0].torpedos;
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

        if (ships[0].energy > 0)
        {
          ships[0].energy -= 1;

          // Check for impulse engines
          if ((ships[0].energy > ENERGY_TO_MOVE_SECTOR) &&
              ((ships[0].impulseDeltaX !== 0) || (ships[0].impulseDeltaY !== 0)))
          {
            // You pay the movement cost even if you hit something...
            ships[0].energy -= ENERGY_TO_MOVE_SECTOR;

            if (tryQuadrantMove(ENTERPRISE,
                                ships[0].sectorRow, ships[0].sectorCol,
                                ships[0].impulseDeltaY, ships[0].impulseDeltaX))
            {
              ships[0].sectorRow += ships[0].impulseDeltaY;
              ships[0].sectorCol += ships[0].impulseDeltaX;
            }
          }

          // else check for warp drive
          else if ((ships[0].energy > ENERGY_TO_MOVE_QUADRANT) &&
              ((ships[0].warpDeltaX !== 0) || (ships[0].warpDeltaY !== 0)))
          {
            // You pay the movement cost even if you hit something...
            ships[0].energy -= ENERGY_TO_MOVE_QUADRANT;

            if (tryGalaxyMove(ENTERPRISE,
                              ships[0].quadrantRow, ships[0].quadrantCol,
                              ships[0].warpDeltaY, ships[0].warpDeltaX))
            {
              ships[0].quadrantRow += ships[0].warpDeltaY;
              ships[0].quadrantCol += ships[0].warpDeltaX;

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
        unhideQuadrant(ships[0].quadrantRow, ships[0].quadrantCol);

        showMap();

        showLrs();

        initQuadrant(galaxy[ships[0].quadrantRow][ships[0].quadrantCol]);

        showSrs();

        showStatus();
      }

      function newGame()
      {
        initGalaxy();

        ships = []
        ships[0] = Object.create(ship);

        ships[0].quadrantRow = random0(NUM_GALAXY_ROWS);
        ships[0].quadrantCol = random0(NUM_GALAXY_COLS);

        ships[0].warpDeltaX = 0;
        ships[0].warpDeltaY = 0;
        ships[0].impulseDeltaX = 0;
        ships[0].impulseDeltaY = 0;

        replenishPlayer();

        enterNewQuadrant();

        informPlayer('Good luck captain!');

        // This extra check is to handle user hitting new game in the middle of a game
        if (tickId !== -1)
        {
          clearTimeout(tickId);
        }
        tickId = setTimeout(timerTick, 100);
      }

      function impulseHandler(cmd)
      {
        // Impulse engines cancels warp drive
        ships[0].warpDeltaX = 0;
        ships[0].warpDeltaY = 0;
        switch (cmd)
        {
          case 'up-left':
            ships[0].impulseDeltaX = -1;
            ships[0].impulseDeltaY = -1;
          break;
          case 'up':
            ships[0].impulseDeltaX = 0;
            ships[0].impulseDeltaY = -1;
          break;
          case 'up-right':
            ships[0].impulseDeltaX = +1;
            ships[0].impulseDeltaY = -1;
          break;
          case 'left':
            ships[0].impulseDeltaX = -1;
            ships[0].impulseDeltaY = 0;
          break;
          case 'stop':
            ships[0].impulseDeltaX = 0;
            ships[0].impulseDeltaY = 0;
          break;
          case 'right':
            ships[0].impulseDeltaX = +1;
            ships[0].impulseDeltaY = 0;
          break;
          case 'down-left':
            ships[0].impulseDeltaX = -1;
            ships[0].impulseDeltaY = +1;
          break;
          case 'down':
            ships[0].impulseDeltaX = 0;
            ships[0].impulseDeltaY = +1;
          break;
          case 'down-right':
            ships[0].impulseDeltaX = +1;
            ships[0].impulseDeltaY = +1;
          break;
        }
      }

      function warpHandler(cmd)
      {
        // Warp drive cancels impulse engines
        ships[0].impulseDeltaX = 0;
        ships[0].impulseDeltaY = 0;
        switch (cmd)
        {
          case 'up-left':
            ships[0].warpDeltaX = -1;
            ships[0].warpDeltaY = -1;
          break;
          case 'up':
            ships[0].warpDeltaX = 0;
            ships[0].warpDeltaY = -1;
          break;
          case 'up-right':
            ships[0].warpDeltaX = +1;
            ships[0].warpDeltaY = -1;
          break;
          case 'left':
            ships[0].warpDeltaX = -1;
            ships[0].warpDeltaY = 0;
          break;
          case 'stop':
            ships[0].warpDeltaX = 0;
            ships[0].warpDeltaY = 0;
          break;
          case 'right':
            ships[0].warpDeltaX = +1;
            ships[0].warpDeltaY = 0;
          break;
          case 'down-left':
            ships[0].warpDeltaX = -1;
            ships[0].warpDeltaY = +1;
          break;
          case 'down':
            ships[0].warpDeltaX = 0;
            ships[0].warpDeltaY = +1;
          break;
          case 'down-right':
            ships[0].warpDeltaX = +1;
            ships[0].warpDeltaY = +1;
          break;
        }
      }

      function torpedoHandler(cmd)
      {
        if (ships[0].torpedos <= 0)
        {
          return;
        }

        switch (cmd)
        {
          case 'up-left':
            addTorpedo(ships[0].sectorRow, ships[0].sectorCol, -1, -1)
          break;
          case 'up':
            addTorpedo(ships[0].sectorRow, ships[0].sectorCol, -1, 0)
          break;
          case 'up-right':
            addTorpedo(ships[0].sectorRow, ships[0].sectorCol, -1, +1)
          break;
          case 'left':
            addTorpedo(ships[0].sectorRow, ships[0].sectorCol, 0, -1)
          break;
          case 'stop':
          break;
          case 'right':
            addTorpedo(ships[0].sectorRow, ships[0].sectorCol, 0, +1)
          break;
          case 'down-left':
            addTorpedo(ships[0].sectorRow, ships[0].sectorCol, +1, -1)
          break;
          case 'down':
            addTorpedo(ships[0].sectorRow, ships[0].sectorCol, +1, 0)
          break;
          case 'down-right':
            addTorpedo(ships[0].sectorRow, ships[0].sectorCol, +1, +1)
          break;
        }

        ships[0].torpedos -= 1;
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
        if (galaxy[ships[0].quadrantRow][ships[0].quadrantCol][1] === '0')
        {
          informPlayer('No starbase in this quadrant to dock with!');
          return;
        }

        if ((ships[0].warpDeltaX !== 0) || (ships[0].warpDeltaY !== 0))
        {
          informPlayer('Warp drive must be disengaged before attempting space dock!');
          // TODO Penalize player?
          return;
        }

        if ((ships[0].impulseDeltaX !== 0) || (ships[0].impulseDeltaY !== 0))
        {
          informPlayer('Impulse engines must be at full stop before attempting space dock!');
          // TODO Penalize player?
          return;
        }


        //
        // Arbitrary gameplay decision - you can only dock from directly above or below
        //

        // IS there a row above us?
        if (ships[0].sectorRow > 0)
        {
          // Is there a starbase there?
          if (quadrant[ships[0].sectorRow - 1][ships[0].sectorCol] === STARBASE)
          {
            dockSuccessful = true;
          }
        }
        // IS there a row below us?
        if (ships[0].sectorRow < 9)
        {
          if (quadrant[ships[0].sectorRow + 1][ships[0].sectorCol] === STARBASE)
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
