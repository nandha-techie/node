var 	mongoose 	=	require('mongoose'),
validators 		=	require('mongoose-validators'),
timestamps		=	require('mongoose-timestamp'),
moment		=	require("moment"),
mongoosePaginate 	=	require('mongoose-paginate'),
findOrCreate 		=	require('mongoose-findorcreate'),
Async			=	require("async"),
Schema 		=	mongoose.Schema,
FileSchema		=	new Schema({
		moderatorId: {
			type: Schema.Types.ObjectId,
			ref: 'Moderator',
			required: true, /*Null not allow*/
		},
		folderId: {
			type: Schema.Types.ObjectId,
			ref: 'Folder',
			required: true, /*Null not allow*/
		},
		name: {
			type: String,
			required: true, /*Null not allow*/
			default: "Base",
		},
		description: {
			type: String,
			validate: [
				validators.isLength({ skipNull: true, skipEmpty: true, }, 0, 300), /*validate length is between 0 to 300*/
			],
		},
		type: {
			type: String,
			required: true, /*Null not allow*/
			default: "folder", /*default Value*/
			enum: ['folder', 'quiz', 'polls', 'survey', 'document'],
			// enum: ['folder', 'quiz', 'polls', 'survey', 'document', 'url'],
		},
		start: {
			type: Boolean,
			default: 0,
		},
	}, {
		collection: 'file', // table name
		toObject: {
			virtuals: true, // enable virtual fields
		},
		toJSON: {
			virtuals: true, // enable virtual fields
		},
	}).plugin(timestamps).plugin(findOrCreate).plugin(mongoosePaginate);
	/*// remove/delete hook
	FileSchema.pre('remove', function(next){
		var file = this;
		mongoose.models.File.remove({ folderId: folder._id }, next);
	});*/

module.exports = mongoose.model('File', FileSchema);