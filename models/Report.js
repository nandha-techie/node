var 	mongoose 	=	require('mongoose'),
validators 		=	require('mongoose-validators'),
timestamps		=	require('mongoose-timestamp'),
moment		=	require("moment"),
bcrypt			=	require("bcrypt"),
mongoosePaginate 	=	require('mongoose-paginate'),
findOrCreate 		=	require('mongoose-findorcreate'),
Schema 		=	mongoose.Schema,
ReportSchema	=	new Schema({
		moderatorId: {
			type: Schema.Types.ObjectId,
			ref: 'Moderator',
		},
		activityId: {
			type: Schema.Types.ObjectId,
			ref: 'Activities',
		},
		reports: [{
			questionId: {
				type: Schema.Types.ObjectId,
				ref: 'Question',
			},
			options: [{
				value: {
					type: Schema.Types.String,
				},
				count: {
					type: Schema.Types.Number,
				},
				correct: {
					type: Boolean,
					default: 0,
				},
			}],
		}],
		participants: [{
			participantId: {
				type: Schema.Types.ObjectId,
				ref: 'Participant',
			},
		}],
		signature: {
			type: Schema.Types.String,
		},
	}, {
		collection: 'report', // table name
		toObject: {
			virtuals: true, // enable virtual fields
		},
		toJSON: {
			virtuals: true, // enable virtual fields
		},
	}).plugin(timestamps).plugin(findOrCreate).plugin(mongoosePaginate);
	// Parse moderatorId Id
	ReportSchema.virtual('moderatorIds').get(function(){
		return String(this.moderatorId);
	});
	// Parse activityId Id
	ReportSchema.virtual('activityIds').get(function(){
		return String(this.activityId);
	});
	// date time conversion
	ReportSchema.virtual('datetime').get(function(){
		return moment.utc(this.createdAt).format("DD/MM/YYYY - HH[h]mm");
	});

module.exports = mongoose.model('Report', ReportSchema);