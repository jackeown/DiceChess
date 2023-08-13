function updateToMove(player){
    document.getElementById('toMove').innerHTML = `${player}'s turn to move`;
}

function checkConnectCode(){
    // enable/disable connect button if username/opponentConnect is nonempty/empty.
    let opponentCode = document.getElementById('opponentCode').value;
    if (opponentCode.length > 0){
        document.getElementById('connect').disabled = false;
    }
    else{
        document.getElementById('connect').disabled = true;
    }
}

function boardStatus(status){
    let chessBoard = document.getElementById("chessBoard");
    chessBoard.classList.remove("active");
    chessBoard.classList.remove("bad");
    chessBoard.classList.remove("good");
    chessBoard.classList.add(status);
}

function sendPosition(conn, position){
    conn.send({
        type: 'position',
        value: position
    });
}

function advantage(){
    let material = 0;

    let values = {
        'P': 1,
        'N': 3,
        'B': 3,
        'R': 5,
        'Q': 9,
        'K': 0
    };

    for(let val of Object.values(board.position())){
        let white = val.includes('w');
        let sign = white ? 1 : -1;
        material += sign * values[val[1]];
    }

    let sign = board.orientation() == 'white' ? 1 : -1;
    return material * sign;
}

function requiredRoll(opponentsRoll){
    if(opponentsRoll){
        return 7 + Math.max(-advantage(), 0);
    }
    return 7 + Math.max(advantage(), 0);
}

function processRoll(roll, opponentsRoll){
    let pronoun = opponentsRoll ? "They" : "You";
    let opponentColor = board.orientation() == 'white' ? 'black' : 'white';
    let color = opponentsRoll ? opponentColor : board.orientation();
    
    updateToMove(`${pronoun} needed a ${requiredRoll(opponentsRoll)} and rolled a ${roll}. ${color}`);
    if (opponentsRoll && roll == requiredRoll(opponentsRoll)){
        boardStatus("bad");
    }
    if (!opponentsRoll && roll == requiredRoll(opponentsRoll)){
        boardStatus("good");
    }
}

function rollDice(){
    // Roll 2 dice and send the result to the opponent.
    let roll = Math.floor(Math.random() * 6) + 1;
    let roll2 = Math.floor(Math.random() * 6) + 1;
    let total = roll + roll2;
    window.conn.send({
        type: 'roll',
        value: total
    });

    processRoll(total, 0);
}

function recvData(data){
    let chessBoard = document.getElementById("chessBoard");

    console.log('Received', data);
    if (data.type == 'position'){
        board.position(data.value);
        if(chessBoard.classList.contains("active")){
            updateToMove(board.orientation());
            boardStatus("active");
            rollDice();
        }
        else if(chessBoard.classList.contains("bad")){
            boardStatus("active");
            updateToMove(board.orientation() == 'white' ? 'black' : 'white');
        }
    }
    else if(data.type == 'roll'){
        processRoll(data.value, 1);
    }
}

function initializeOrientation(){
    if (peer.id < window.conn.peer){
        board.orientation('white');
    }
    else{
        board.orientation('black');
    }
}

function processConnection(conn){
    if (conn){
        window.conn = conn;
        conn.on('data', recvData);
    }
    console.log('Connected to', window.conn.peer);
    updateToMove('white');
    document.getElementById('opponentCode').value = window.conn.peer;
    document.getElementById('connect').disabled = true;
    initializeOrientation();

    document.getElementById('chessBoard').classList.add("active")
}

function connectToPeer(id){
    if (!id)
        id = document.getElementById('opponentCode').value;

    let conn = peer.connect(id);
    conn.on('open', processConnection);
    conn.on('data', recvData);
    window.conn = conn;
    return conn;
}
















document.body.onload = function () {
    window.peer = new Peer();

    peer.on('connection', processConnection);

    // Set Connect code in the DOM.
    setTimeout(function(){
        document.getElementById('connectCode').innerHTML = peer.id;
    },3000);
};