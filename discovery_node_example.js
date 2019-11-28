context.set('id', 'node5');

/**
 * Get the inital message payload which inital
 * the discovery protocol
 **/
function getInitDiscoveryPayload() {
    return {
        from: context.get('id'),
        to: '*',
        data: {
            type: 'INIT_DISCOVERY',
            currentTemperature: 25, // Assuming that the current temp is 25
            sinkHops: context.get('sinkHops')
        }
    }
}

/**
 * Return acknowledgement for discovery message
 **/
function getInitDiscoveryACKPayload(to) {
    return {
        from: context.get('id'),
        to: to,
        data: {
            type: 'ACK_DISCOVERY',
            currentTemperature: 25,
            sinkHops: context.get('sinkHops')
        }
    }
}

/**
 * Update local table for neighbor with there
 * distance and current tempreature
**/
function updateNeighborTable(payload) {
    var neighborTable = flow.get(context.get('id')) || {};

    // Store the tempreature and distance from sink for each neighbor
    neighborTable[payload.from] = {
        currentTemperature: payload.data.currentTemperature,
        sinkHops: payload.data.sinkHops
    };

    flow.set(context.get('id'), neighborTable);
}

/**
 * After receiving distance information fo the neighbor
 * update self distance if found a distance smaller than current
 * self distance.
 *
 * Return: true if self distance is updated
**/
function updateCurrentMinHop(newHops){
    var currentHop = context.get('sinkHops');
    var isUpdated = false;
    if(currentHop === -1){
        isUpdated = true;
        context.set('sinkHops', newHops);
    }else if(newHops < currentHop){
        isUpdated = true;
        context.set('sinkHops', newHops);
    }
    return isUpdated;
}

/**
 * Get payload to notifiy self distance update to
 * neighbor
**/
function getUpdateDistancePayload(){
    return {
        from: context.get('id'),
        to: '*',
        data: {
            type: 'UPDATE_DISTANCE',
            currentTemperature: 25,
            sinkHops: context.get('sinkHops')
        }
    }
}

var payload = {};

// Ignore broadcast message from self
if (msg.payload.from === context.get('id')) {
    payload = {};
}
// If trigger from start_discovery button send start_discovery message
else if (msg.payload.data.action === 'start_discovery') {
    payload = getInitDiscoveryPayload();
    context.set('sinkHops', -1);
}
// If recived message of INIT_DISCOVERY return ACK_DISCOVERY and update neighbor table
else if (msg.payload.data.type === 'INIT_DISCOVERY') {
    updateNeighborTable(msg.payload)
    payload = getInitDiscoveryACKPayload(msg.payload.from);
}
// If we receive an ACK for INIT_DISCOVERY then update self distance and neighbor table
else if (msg.payload.data.type === 'ACK_DISCOVERY') {
    updateNeighborTable(msg.payload);

    if(msg.payload.data.isSink){
        var isUpdated = updateCurrentMinHop(1);
        if(isUpdated){
            payload = getUpdateDistancePayload();
        }
    }
}
// update neighbor distance and update self distance
else if(msg.payload.data.type === 'UPDATE_DISTANCE'){
    updateNeighborTable(msg.payload);
    var isUpdated = updateCurrentMinHop(msg.payload.data.sinkHops + 1);
    if (isUpdated){
        payload = getUpdateDistancePayload();
    }
}

return {
    payload
};

