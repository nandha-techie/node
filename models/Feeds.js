var mongoose		=	require('mongoose'),
validators 		=	require('mongoose-validators'),
timestamps		=	require('mongoose-timestamp'),
moment		=	require("moment"),
mongoosePaginate 	=	require('mongoose-paginate'),
findOrCreate 		=	require('mongoose-findorcreate'),
Schema 		=	mongoose.Schema,
FeedSchema		=	new Schema({
		moderatorId: {
			type: Schema.Types.ObjectId,
			ref: 'Moderator',
			required: true, /*Null not allow*/
		},
		description: {
			type: Schema.Types.String,
			required: true, /*Null not allow*/
		},
		type: {
			type: Schema.Types.String,
			required: true, /*Null not allow*/
		},
	}, {
		collection: 'feeds', // table name
		toObject: {
			virtuals: true, // enable virtual fields
		},
		toJSON: {
			virtuals: true, // enable virtual fields
		},
	}).plugin(timestamps).plugin(findOrCreate).plugin(mongoosePaginate);
	// Parse get Created Time
	FeedSchema.virtual('createTime').get(function(){
		// return moment.utc(moment().diff(moment(this.createdAt))).format("mm mins");
		return moment.duration(moment().diff(moment(this.createdAt))).humanize().replace("minutes", "mins").replace("a few seconds", "Just now");
	});

module.exports = mongoose.model('Feed', FeedSchema);