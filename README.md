# DiceChess - A self-balancing stochastic chess variant
### See rules.html for how to play
# TODO:
- Make resilient to refreshes / disconnects:
    - I do this by keeping both peerIds in the URL of each after connection.
    - When reconnecting:
        - Either side having a non-starting state should send their state.
        - Upon receiving a state:
            - If yours is a start state, accept the new one automatically.
            - Otherwise, same propose / accept / reject pipeline as for takebacks. 