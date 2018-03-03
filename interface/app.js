
class AppError extends Error {
    constructor(state, message, data) {
        super(message);
        this.state = state;
        this.msg = message;
        this.data = data;
        this.stack = undefined;
        this.isdefine = true;
    }

    toString() {
        return {
            state: this.state,
            msg: this.message,
            data: this.data || '',
        };
    }
    toJSON() {
        return {
            state: this.state,
            msg: this.message,
            data: this.data || '',
        };
    }
}

class App {
    constructor() {

    }

    static update(oldData, newData, keys) {
        if (!oldData || !newData) return oldData;
        for (let i = 0; i < keys.length; i++) {
            if (undefined == newData[keys[i]]) continue;
            oldData[keys[i]] = newData[keys[i]];
            if (oldData[keys[i]].replace)
                oldData[keys[i]] = oldData[keys[i]].replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, '');
        }
        return oldData;
    }

    static filter(data, keys) {
        let d = {};
        if (!data) return d;
        for (let i = 0; i < keys.length; i++) {
            if (undefined == data[keys[i]]) continue;
            d[keys[i]] = data[keys[i]];
            if (d[keys[i]].replace)
                d[keys[i]] = d[keys[i]].replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, '');
        }
        return d;
    }

    static haskeys(data, keys) {
        if (!data) return false;
        for (let i = 0; i < keys.length; i++) {
            if (undefined == data[keys[i]]) 
                return false;
        }
        return true;
    }

    static onlykeys(data, keys) {
        if (!data) return false;
        for (let key in data) {
            if (keys.indexOf(key) < 0) return false;
        }
        return true;
    }

    static res(data, msg = '') {
        return {
            state: 0,
            msg: msg,
            data: data
        };
    }

    static where(query, ops) {
        Object.keys(ops).forEach((key) => {
            if (!query[key] || query[key].op) return;
            query[key] = {
                op: ops[key],
                val: query[key]
            };
        });

        let where = {};
        for (let k in query) {
            if ('' === query[k])
                continue;
            where[k] = App.op(query[k]);
        }
        return where;
    }

    static order(order, keys) {
        let orders = [];
        for (let k in order) {
            let orderField = order[k];
            let OrderType = 'ASC';
            if (orderField instanceof Array
             && orderField.length == 2
             && ['ASC', 'DESC'].indexOf(orderField[1]) >= 0
            ) {
                OrderType = orderField[1];
                orderField = orderField[0];
            }
            if (keys.indexOf(orderField) < 0) continue;
            orders.push([orderField, OrderType]);
        }
        return orders;
    }

    static get ops() {
        return {
            Equal: '=',
            notEqual: '!=',
            less: '<',
            lessOrEqual: '<=',
            greater: '>',
            greaterOrEqual: '>=',
            notLike: '!$',
            like: '$',
            between: '<>',
            notBetween: '!<>',
        };
    }

    static op(data) {
        const ops = {
            '<=': '$lte',
            '>=': '$gte',
            '!=': '$ne',
            '!$': '$notLike',
            '=': '$eq',
            '<': '$lt',
            '>': '$gt',
            '^': '$bitXor',
            '&': '$bitAnd',
            '|': '$bitOr',
            '$': '$like',
            '<>': '$between',
            '!<>': '$notBetween'
        };

        let operator = '$eq';
        if (data.op && ops[data.op]) {
            operator = ops[data.op];
            data = data.val;
        }

        return JSON.parse('{"' + operator + '": ' + JSON.stringify(data) + '}');
    }

    static async query(data, Model, ops) {
        let keys = Model.keys();

        keys = ['id'].concat(keys).concat(['create_time', 'update_time']);
        
        if (!App.haskeys(data, ['index', 'count', 'query'])) {
            throw (this.error.param);
        }
        
        // 生成查询条件
        let q = { where: {}, order: [] };
        data.query = App.filter(data.query, keys);
        q.where = App.where(data.query, ops);

        // 生成排序，默认以创建时间降序
        data.order = data.order || [];
        data.order.push(['create_time', 'DESC']);
        q.order = App.order(data.order, keys);

        let datalist = [], total = 0;
        try {
            q.attributes = [[Model.db.fn('COUNT', Model.db.col('id')), 'total']];
            total = (await Model.findOne(q)).dataValues.total; // 获取总数

            q.attributes = undefined;

            q.offset = parseInt(data.index) || 0;
            if (data.count > 0) q.limit = parseInt(data.count);

            datalist = await Model.findAll(q);
            let fields = data.fields || keys;

            datalist = datalist.map(d => App.filter(d, fields));
        } catch (err) {
            if (err.isdefine) throw (err);
            throw (App.error.db(err));
        }
        return {
            data: datalist,
            total: total
        };
    }

    static ok(action, data = undefined, customizeTip = false) {
        return {
            state: 0,
            msg: action + (customizeTip ? '' : '成功！'),
            data: data
        };
    }

    static err(err) {
        if (err.isdefine) {
            return err;
        } else {
            return App.error.server(err.message, err.stack);
        }
    }

    static get error() {
        return {
            __count: 7,
            init: function (errorCode) {
                this.__count = errorCode;
            },
            reg: function (msg, fn = null) {
                let errorCode = this.__count++;
                if (fn) {
                    return function (data) {
                        return new AppError(
                            errorCode,
                            msg,
                            fn(data)
                        );
                    };
                } else {
                    return new AppError(
                        errorCode,
                        msg
                    );
                }
            },
            existed: function (obj, exist = true, customizeTip = false) {
                return new AppError(
                    1,
                    obj + (customizeTip ? '' : (exist ? '已存在！' : '不存在！'))
                );
            },
            param: new AppError(2, '参数错误！'),
            query: new AppError(3, '无效查询条件！'),
            db: function (err) {
                return new AppError(
                    4,
                    '数据库错误：' + err
                );
            },
            network: function (err) {
                return new AppError(
                    5,
                    '网络错误：' + err
                );
            },
            limited: new AppError(
                6,
                '权限不足'
            ),

            server: function (err, stack) {
                if (err) console.warn(err);
                if (stack) console.warn(stack);
                return new AppError(
                    -1,
                    '服务器错误！' + (err ? err : '')
                );
            },
        };
    }
}


module.exports = App;