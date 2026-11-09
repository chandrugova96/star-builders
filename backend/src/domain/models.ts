import { Schema, model } from 'mongoose';
const oid = Schema.Types.ObjectId;
const options = {
    timestamps: true, strict: 'throw' as const
};
export const Gate = model('PostingGate', new Schema({
    _id: String, version: {
        type: Number, default: 0
    }
}, options));
export const Receipt = model('PostingReceipt', new Schema({
    key: {
        type: String, required: true, unique: true
    }, fingerprint: {
        type: String, required: true
    }, result: Schema.Types.Mixed
}, options));
export const Audit = model('AuditLog', new Schema({
    actorId: {
        type: oid, required: true
    }, action: {
        type: String, required: true
    }, entityId: String, details: Schema.Types.Mixed
}, options));
export const SiteModel = model('Site', new Schema({
    siteCode: {
        type: String, required: true, unique: true
    }, name: {
        type: String, required: true
    }, location: {
        type: String, default: ''
    }, status: {
        type: String, enum: ['Active', 'On Hold', 'Completed'], default: 'Active'
    }, budgetPaise: {
        type: Number, required: true
    }, supervisorId: {
        type: oid, default: null
    }, assignments: [{
            userId: oid, assignedFrom: Date, assignedTo: Date
        }]
}, options));
export const LabourModel = model('Labourer', new Schema({
    labourCode: {
        type: String, required: true, unique: true
    }, name: {
        type: String, required: true
    }, phone: {
        type: String, default: ''
    }, category: {
        type: String, required: true
    }, status: {
        type: String, enum: ['Active', 'Inactive'], default: 'Active'
    }, salaryHistory: [{
            from: {
                type: String, required: true
            }, ratePaise: {
                type: Number, required: true
            }, reason: String, changedBy: oid
        }]
}, options));
const attendance = new Schema({
    labourId: {
        type: oid, required: true
    }, date: {
        type: String, required: true
    }, allocations: [{
            siteId: {
                type: oid, required: true
            }, halves: {
                type: Number, required: true
            }, ot: {
                type: String, required: true
            }, updatedBy: oid
        }]
}, options);
attendance.index({
    labourId: 1, date: 1
}, {
    unique: true
});
export const AttendanceModel = model('AttendanceDay', attendance);
export const Period = model('PayrollPeriod', new Schema({
    start: {
        type: String, required: true, unique: true
    }, end: {
        type: String, required: true
    }, status: {
        type: String, enum: ['Pending', 'Approved'], default: 'Pending'
    }, approvedBy: oid, approvedAt: Date
}, options));
const payroll = new Schema({
    week: {
        type: String, required: true
    }, labourId: {
        type: oid, required: true
    }, name: {
        type: String, required: true
    }, days: {
        type: Number, required: true
    }, grossPaise: {
        type: Number, required: true
    }, advancePaise: {
        type: Number, required: true
    }, adjustmentPaise: {type: Number, default: 0},
    adjustments: [{adjustmentId: oid, amountPaise: Number, kind: String, originalWeek: String, siteId: oid, originalDate: String, reason: String}],
    netPaise: {
        type: Number, required: true
    }, paidPaise: {
        type: Number, default: 0
    }, items: [{
            date: String, siteId: oid, halves: Number, ot: String, ratePaise: Number, earnedPaise: Number
        }], recoveries: [{
            advanceId: oid, amountPaise: Number
        }]
}, options);
payroll.index({
    week: 1, labourId: 1
}, {
    unique: true
});
export const Payroll = model('Payroll', payroll);
export const AdvanceModel = model('LabourAdvance', new Schema({
    labourId: {
        type: oid, required: true
    }, date: {
        type: String, required: true
    }, amountPaise: {
        type: Number, required: true
    }, remainingPaise: {
        type: Number, required: true
    }, createdBy: {
        type: oid, required: true
    }
}, options));
const payment = new Schema({
    labourId: {
        type: oid, required: true
    }, date: {
        type: String, required: true
    }, amountPaise: {
        type: Number, required: true
    }, mode: {
        type: String, enum: ['Cash', 'UPI', 'Bank'], required: true
    }, throughWeek: {
        type: String, required: true
    }, createdBy: {
        type: oid, required: true
    }, allocations: [{
            payrollId: oid, week: String, amountPaise: Number
        }]
}, options);
export const PaymentModel = model('Payment', payment);
const reversal = new Schema({
    kind: {type: String, enum: ['Payment', 'Advance'], required: true},
    sourceId: {type: oid, required: true},
    labourId: {type: oid, required: true},
    amountPaise: {type: Number, required: true},
    recoveredPaise: {type: Number, default: 0},
    settlementWeek: String,
    date: {type: String, required: true},
    reason: {type: String, required: true},
    createdBy: {type: oid, required: true},
}, options);
reversal.index({kind: 1, sourceId: 1}, {unique: true});
export const Reversal = model('FinancialReversal', reversal);
export const Adjustment = model('PayrollAdjustment', new Schema({
    labourId: {type: oid, required: true},
    originalPayrollId: {type: oid, required: true},
    originalWeek: {type: String, required: true},
    originalDate: String,
    siteId: oid,
    settlementWeek: {type: String, required: true},
    kind: {type: String, enum: ['WAGE', 'ADVANCE_REFUND'], required: true},
    amountPaise: {type: Number, required: true},
    reason: {type: String, required: true},
    sourceReversalId: oid,
    createdBy: {type: oid, required: true},
}, options));
Adjustment.schema.index({settlementWeek: 1, labourId: 1});
export const businessModels = [Gate, Receipt, Audit, SiteModel, LabourModel, AttendanceModel, Period, Payroll, AdvanceModel, PaymentModel, Reversal, Adjustment];
export async function initializeBusiness() {
    for (const model of businessModels) {
        await model.createCollection();
        await model.createIndexes();
    }
    await Gate.updateOne({
        _id: 'posting'
    }, {
        $setOnInsert: {
            version: 0
        }
    }, {
        upsert: true
    });
}
