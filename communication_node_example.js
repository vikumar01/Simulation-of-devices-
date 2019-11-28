context.set('id', 'node1');

// Tempreature thershold which decides which node to
// user in communication path
const MIN_TEMP_THRESHOLD = 30;
const MAX_TEMP_THRESHOLD = 40;

/**
 * Update self temperature based on delta
**/
function updateTemperature(delta) {
    var currentTemp = context.get('temperature');
    if (!currentTemp) {
        currentTemp = MIN_TEMP_THRESHOLD;
    }

    var newTemperature = currentTemp + delta;
    if(newTemperature < MIN_TEMP_THRESHOLD){
        newTemperature = MIN_TEMP_THRESHOLD;
    }
    if(newTemperature > MAX_TEMP_THRESHOLD){
        newTemperature = MAX_TEMP_THRESHOLD;
    }

    context.set('temperature', newTemperature);
}

// Update temperature whenever node is used (comm and data collection)
updateTemperature(1);

/**
 * Get the next neighbor close to sink and with less temperature
**/
function getNextHopId() {
    var neighborTable = flow.get(context.get('id'));

    var neighborCosts = {};

    Object.entries(neighborTable).forEach((item)=> {
        neighborCosts[item[0]] = item[1].currentTemperature * item[1].sinkHops;
    })

    var nextHop = Object.keys(neighborCosts).reduce((result, nextKey) => {
        return neighborCosts[result] <= neighborCosts[nextKey]? result: nextKey;
    }, Object.keys(neighborTable)[0]);

    return nextHop;
}

/**
 * Get payload mesage which send data form this sensor
**/
function getDataPayload() {
    return {
        from: context.get('id'),
        dest: 'sink',
        to: getNextHopId(),
        path: [context.get('id')],
        timestamp: Date.now(),
        data: {
            type: "FORWARD_PAYLOAD",
            body: getOxygenLevel()  // This will change based on the type of sensor
        }
    }
}

/**
 * Update neighbor temperature value in self neighborTable
**/
function updateNeighborTemperature(nodeId, temperature){
    var neighborTable = flow.get(context.get('id'));
    neighborTable[nodeId].currentTemperature = temperature;
    flow.set(context.get('id'), neighborTable);
}

/**
 * Get forward payload for incoming forward data
**/
function getForwardPayload(payload) {
    return {
        from: payload.from,
        dest: payload.dest,
        to: getNextHopId(),
        path: payload.path.concat(context.get('id')),
        timestamp: payload.timestamp,
        data: payload.data
    }
}

/**
 * Return forward ack for forward message
**/
function getForwardAckPayload(payload){
    return {
        from: context.get('id'),
        to: payload.path[payload.path.length - 1],
        data: {
            type: 'FORWARD_ACK',
            currentTemp: context.get('temperature')
        }
    }
}

var message = [{}];

// Ignore if broadcast from self
if(msg.payload.from  === context.get('id')){
    message = [{}];
}
// If message forward request forward to next neighbor
// and send ack
else if (msg.payload.data.type === 'FORWARD_PAYLOAD') {
    message = [{
        payload: getForwardPayload(msg.payload)
    }, {
        payload: getForwardAckPayload(msg.payload)
    }]
}
// For every interval generate data
else if (msg.payload.data.type === 'ACTION_GENERATE_PAYLOAD') {
    message = [{
        payload: getDataPayload()
    }]
}
// After forward ack update neighbor temperature
else if(msg.payload.data.type === 'FORWARD_ACK'){
    updateNeighborTemperature(msg.payload.from, msg.payload.data.currentTemp);
    message = [{}]
}
// Trigger to decrease temperature
else if(msg.payload.data.type === 'ACTION_DECREASE_TEMPERATURE'){
    updateTemperature(-2);
    message = [{}]
}

return [message];

