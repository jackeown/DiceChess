function promptForPromotion(piece){
    let newPiece = 'P';
    while (!['Q', 'R', 'B', 'N'].includes(newPiece.toUpperCase())){
        newPiece = window.prompt(`Promote to which piece? Enter Q, R, B, or N.`, 'Q');
    }
    return piece[0] + newPiece.toUpperCase();
}

////////////////////////////////////////////////////////////////


function xDistSigned(source, target){
    return target.charCodeAt(0) - source.charCodeAt(0);
}

function yDistSigned(source, target){
    return target.charCodeAt(1) - source.charCodeAt(1);
}

function xDist(source, target){
    return Math.abs(source.charCodeAt(0) - target.charCodeAt(0));
}

function yDist(source, target){
    return Math.abs(source.charCodeAt(1) - target.charCodeAt(1));
}



function rank(spot){
    return parseInt(spot[1]);
}

function file(spot){
    return spot[0];
}


function offsetSpot(spot, dx, dy){
    let file = String.fromCharCode(spot.charCodeAt(0) + dx);
    let rank = String.fromCharCode(spot.charCodeAt(1) + dy);
    return `${file}${rank}`;
}


function nothingBetweenDiag(source, target, pos){
    for(let i = 1; i < xDist(source, target); i++){
        let file = file(source) < file(target) ? filePlus(source, i) : filePlus(source, -i);
        let rank = rank(source) < rank(target) ? rankPlus(source, i) : rankPlus(source, -i);
        let spot = `${file}${rank}`;
        let piece = pos[spot];
        if(piece !== undefined){
            return false;
        }
    }
    return true;
}

function nothingBetweenRowCol(source, target, pos){
    if (xDist(source, target) == 0){
        for(let i = 1; i < yDist(source, target); i++){
            let rank = rank(source) < rank(target) ? rankPlus(source,i) : rankPlus(source, -i);
            let spot = `${source}${rank}`;
            let piece = pos[spot];
            if(piece !== undefined){
                return false;
            }
        }
        return true;
    }
    else if (yDist(source, target) == 0){
        for(let i = 1; i < xDist(source, target); i++){
            let file = file(source) < file(target) ? filePlus(source, i) : filePlus(source, -i);
            let spot = `${file}${source}`;
            let piece = pos[spot];
            if(piece !== undefined){
                return false;
            }
        }
        return true;
    }
    else{
        return false;
    }
}

