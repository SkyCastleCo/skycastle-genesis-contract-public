const Enum = require('enum');

const CouponStatusEnum = new Enum({
    'Inactive': 0,
    'Available': 1,
    'Processing': 2,
    'Finished' : 3
})

module.exports = CouponStatusEnum;
