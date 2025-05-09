/**
 * Process the TCP response data from a device
 * @param {Buffer} response - The raw buffer response from the TCP socket
 * @param {string} ip - The IP address of the device
 * @returns {Object} - Processed device data
 */
async function processResponse(response, ip) {
    try {
        console.log(`Processing TCP response for IP ${ip}. Raw response: ${response.toString('hex')}`);

        // Convert Buffer to array of byte values if it's not already an array
        const responseBytes = Array.from(response);

        if (responseBytes.length !== 16) {
            throw new Error(`Invalid response length for IP ${ip}: expected 16, got ${responseBytes.length}`);
        }

        // Calculate checksum
        const first13Elements = responseBytes.slice(0, 13);
        let check_sum = first13Elements.reduce((acc, curr) => acc + curr, 0) & 0xFF;

        // Verify signature bytes and checksum
        if (!(responseBytes[14] === 67 && responseBytes[15] === 83 && responseBytes[13] === check_sum)) {
            console.error(`Invalid response from ${ip}. Expected checksum: ${check_sum}, got: ${responseBytes[13]}`);
            throw new Error(`Invalid checksum or signature from ${ip}`);
        }

        // Extract device properties
        const byte_values = responseBytes.slice(2, 9);
        const device_props = ["FVout", "FVReturn", "BV", "Check", "GadgetStatus", "FenceStatus", "AlarmStatus"];
        const device_data = Object.fromEntries(byte_values.map((value, index) => [device_props[index], value]));

        // Process bit flags from the 12th byte
        const twelfthByte = responseBytes[12];
        const device_props_bool = ["Inp4", "Inp3", "Inp2", "ServiceMode", "LidStatus", "DrinageIntrusion", "EncloserStatus", "MainsStatus"];
        for (let i = 0; i < device_props_bool.length; i++) {
            device_data[device_props_bool[i]] = (twelfthByte & (1 << i)) ? 1 : 0;
        }

        console.log(`Processed TCP response for IP ${ip}:`, device_data);
        return device_data;
    } catch (error) {
        console.error(`Error processing TCP response for IP ${ip}: ${error.message}`);
        throw error;
    }
}

module.exports = {
    processResponse
};