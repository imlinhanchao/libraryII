const db = require('../db');
const prefix = require('../config').db.prefix;
let orm = {
    id: {
        type: db.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        comment: "唯一id，自增长"
    },
    bookId: {
        type: db.INTEGER,
        comment: "图书ID"
    },
    accountId: {
        type: db.INTEGER,
        comment: "借书帐号"
    },
    remark: {
        type: db.STRING(800),
        comment: "备注"
    },
    lend_date: {
        type: db.INTEGER,
        comment: "借书日期"
    },
    back_date: {
        type: db.INTEGER,
        comment: "归还日期"
    }
};
let table_name = prefix + 'lend_record';
module.exports = db.defineModel(table_name, orm, {
    comment: "借书记录表",
});
module.exports.db = db;
module.exports.tb = table_name;
module.exports.keys = function () {
    return Object.keys(orm);
}