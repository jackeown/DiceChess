# DiceChess - A self-balancing stochastic chess game based on rolling dice
## See rules.html for how to play


Thoughts on implementation:

1. Create a schema for the game state:
    - **board** (the positions of all pieces)
    - **whoseTurn** = "white" or "black"
    - **getsTwoTurns** = true or false
    - **castleEligibility**:
        - Initially ```['bk','bkr','bqr','wk','wkr','wqr']```. 
    - **enPassant**:
        - Initially null, but can be set to the space a pawn skipped when moving two spaces.
2. Messages passed between players:
    - Move a piece (from, to)
    - Dice roll (dice1, dice2)
3. When a player tries to move a piece:
    - Check the piece is the right color
    - Check if the move "represents" a move in the set of legal moves
        - A function of the state only
    - If legit, send move to other player


High-level functions to implement:
```javascript
allLegalMoves(state)
makeMove(state, move)
diceRoll(state)
```


Helper functions to implement:
```javascript
allLegalMoves(state)
    legalKnightMoves(state)
    legalRookMoves(state)
    legalBishopMoves(state)
    legalQueenMoves(state)
    legalKingMoves(state)
    legalPawnMoves(state)
```

The rest should be:
+ serialization/deserialization
+ Event Handling
    + PeerJS messages
    + Move Making
