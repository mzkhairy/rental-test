const axios = require('axios');
async function test() {
  try {
    // 1. login to BGR
    const resAuth = await axios.post('http://127.0.0.1:4002/api/auth/login', { employeeCode: 'BGR-ADM-7', password: 'Rentsync123!' }, {
        headers: { 'Content-Type': 'application/json' }
    });
    const cookie = resAuth.headers['set-cookie'][0];
    
    // 2. GET vehicles from JKT
    const resVeh = await axios.get('http://127.0.0.1:4001/api/vehicles/available');
    const vehicleId = resVeh.data.vehicles[0]._id;

    // 3. GET customers from BGR
    const resCust = await axios.get('http://127.0.0.1:4002/api/customers', { headers: { Cookie: cookie } });
    const customerId = resCust.data[0]._id;
    
    // 4. POST rentals to BGR
    const resRent = await axios.post('http://127.0.0.1:4002/api/rentals', {
        rentalCode: 'RNT-' + Date.now(),
        vehicleId: vehicleId,
        customerId: customerId,
        totalDays: 2,
        totalPrice: 1000000,
        startDate: new Date().toISOString(),
        expectedReturnDate: new Date(Date.now() + 2*24*3600*1000).toISOString(),
        targetBranchCode: 'JKT',
        pickupBranch: 'BGR'
    }, { headers: { Cookie: cookie } });
    console.log(resRent.data);
  } catch (err) {
    if (err.response) {
      console.log('Error Data:', err.response.data);
    } else {
      console.log('Error:', err.message);
    }
  }
}
test();
