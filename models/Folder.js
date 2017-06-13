var 	mongoose 	=	require('mongoose'),
validators 		=	require('mongoose-validators'),
timestamps		=	require('mongoose-timestamp'),
moment		=	require("moment"),
mongoosePaginate 	=	require('mongoose-paginate'),
findOrCreate 		=	require('mongoose-findorcreate'),
Schema 		=	mongoose.Schema,
FolderSchema	=	new Schema({
		moderatorId: {
			type: Schema.Types.ObjectId,
			ref: 'Moderator',
			required: true, /*Null not allow*/
		},
		name: {
			type: String,
			required: true, /*Null not allow*/
			default: "Base",
		},
		isRoot: {
			type: Boolean,
			default: 0,
		},
		fileId: {
			type: Schema.Types.ObjectId,
			ref: 'File',
		},
		description: {
			type: String,
			validate: [
				validators.isLength({ skipNull: true, skipEmpty: true, }, 0, 300), /*validate length is between 0 to 300*/
			],
		},
	}, {
		collection: 'folder', // table name
		toObject: {
			virtuals: true, // enable virtual fields
		},
		toJSON: {
			virtuals: true, // enable virtual fields
		},
	}).plugin(timestamps).plugin(findOrCreate).plugin(mongoosePaginate);
	// remove/delete hook
	FolderSchema.pre('remove', function(next){
		var folder = this;
		mongoose.models.File.remove({ folderId: folder._id }, function(err){
			mongoose.models.File.remove({ _id: folder.fileId }, next);
		});
	});

module.exports = mongoose.model('Folder', FolderSchema);