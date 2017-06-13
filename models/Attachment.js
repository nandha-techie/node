var 	mongoose 	=	require('mongoose'),
validators 		=	require('mongoose-validators'),
timestamps		=	require('mongoose-timestamp'),
moment		=	require("moment"),
Path			=	require("path"),
mongoosePaginate 	=	require('mongoose-paginate'),
findOrCreate 		=	require('mongoose-findorcreate'),
Schema 		=	mongoose.Schema,
AttachmentSchema	=	new Schema({
		moderatorId: {
			type: Schema.Types.ObjectId,
			ref: 'Moderator',
			required: true, /*Null not allow*/
		},
		fileId: {
			type: Schema.Types.ObjectId,
			ref: 'File',
			required: true, /*Null not allow*/
			index: {
				unique: true, /*unique validation/index*/
			},
		},
		type: {
			type: String,
			required: true, /*Null not allow*/
			default: "file", /*default Value*/
			enum: ['url', 'file'],
		},
		fileType: {
			type: String,
			default: "pdf", /*default Value*/
			enum: ['pdf', 'doc', 'ppt', 'image', 'url', 'zip', 'video'],
		},
		url: {
			type: String,
		},
		file: {
			type: String,
		},
		title: {
			type: String,
		},
		marker: {
			type: Schema.Types.Number,
			default: 0,
		},
		directory: {
			type: Schema.Types.String,
		},
		description: {
			type: String,
			validate: [
				validators.isLength({ skipNull: true, skipEmpty: true, }, 0, 300), /*validate length is between 0 to 300*/
			],
		},
	}, {
		collection: 'attachment', // table name
		toObject: {
			virtuals: true, // enable virtual fields
		},
		toJSON: {
			virtuals: true, // enable virtual fields
		},
	}).plugin(timestamps).plugin(findOrCreate).plugin(mongoosePaginate);
	// remove/delete hook
	AttachmentSchema.pre('remove', function(next){
		var attachment = this;
		mongoose.models.File.remove({ _id: attachment.fileId }, next);
	});
	// Path
	AttachmentSchema.virtual('path').get(function(){
		return "/attachments/" + this.file;
	});
	// Extension
	AttachmentSchema.virtual('extension').get(function(){
		if(this.fileType == 'video') return Path.extname(this.file).replace(".", "");
		else return null;
	});
	// Document/Ppt Path
	AttachmentSchema.virtual('docpath').get(function(){
		if(this.fileType == 'doc' || this.fileType == 'ppt'){
			var file = Path.basename(this.file),
			originalFile = file.replace(Path.extname(file), "");
			return "/attachments/" + originalFile + '/' + originalFile + '.html';
		}else if(this.fileType == 'zip'){
			var file = Path.basename(this.file),
			originalFile = file.replace(Path.extname(file), "");
			// return "/attachments/" + originalFile + '/' + originalFile + '.html';
			return "/attachments/" + originalFile + '/' + this.directory;
		}else return null;
	});

module.exports = mongoose.model('Attachment', AttachmentSchema);