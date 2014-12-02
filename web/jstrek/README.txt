(importing from another SCCS)
First checkin was dated 02/17/2012

Multiple "panels" of the UI existed but were not arranged in any way.

	Ship Status

	Galactic Map (but no highlighting)

	Long Range Scanner

	Short Range Scanner

	Warp Drive Control

	Impulse Engines Control

	LRS Button

	Dock Button

	New Game Button

Enemy ships moved but did not fire.

Torpedos were in the code but apparently did no damage.

Phasers were not in the code yet.

Starbases and docking were in.


Second checkin was dated 02/18/2012

"After torpedo work"

Unexpected side effect - now that the Klingons can shoot back, it is more of a "twitch game" than I anticipated...

(Note - enemy ships not allowed to use diagonal shots)

Enemy ships as powerful as the player ships. So took 4 hits to kill...

UI still not arranged. Still no phasers.


Third checkin was also dated 02/18/2012

"jstrek after mission, difficulty level, victory detection"


Fourth checkin was dated 02/25/2012


"jstrek after adding GUI positioning, map highlight, phasers, and multi-message"

First PLAYABLE version.
Apparently not playable with IE (perhaps my screen resolution was different back then???)

11/30/2014 - experiment in starbase vulnerability

Every 5 seconds a starbase that has enemy ships in it's quadrant gets attacked.
SOS messages are sent until the starbase is destroyed or rescued.

Still TODO - starbases should be much stronger (energy = 9999 currently - the same as a ship).
Also want to make it where starbase attacks don't occur if player ship is present.
(Currently this would allow the SRS to get out of sync!)


12/01/2014 - finishing up starbase vulnerability

Starbases now 10 x player ship energy.
Starbase attacks now scaled by number of enemies present
Starbase not attacked if player present (presumably you are considered a bigger threat)
Fixed code indentation and whitespace in handleStarbase()
Reduced player torpedos to 30 (99 is too many, 10 is too few)

Gameplay issue - the attacks on starbases also reveal the starbase positions.
Have to ponder this some more...

Also feels like there should be a delay before the NEXT starbase attack when you rescue one...



Other ideas:

Should a clear impulse engine path be required in order to engage warp drive in a particular direction?
If so, is trying to warp through a star a "blocker" or a "destroyer"?
