# DiceChess - A self-balancing stochastic chess variant
### See rules.html for how to play
# TODO:
- Make resilient to refreshes / disconnects:
    - I do this by keeping both peerIds in the URL of each after connection.
    - Also I need to send the full game state when reconnecting...And maybe store in local storage?
- Make initializeOrientation fair.