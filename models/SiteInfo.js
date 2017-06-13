var 	mongoose 	=	require('mongoose'),
validators 		=	require('mongoose-validators'),
timestamps		=	require('mongoose-timestamp'),
moment		=	require("moment"),
bcrypt			=	require("bcrypt"),
path			=	require("path"),
mongoosePaginate 	=	require('mongoose-paginate'),
findOrCreate 		=	require('mongoose-findorcreate'),
Schema 		=	mongoose.Schema,
InfoSchema		=	new Schema({
		title: {
			type: String,
			required: true,
			validate: [
				validators.isLength(1, 50), /*validate length is between 1 to 50*/
			],
		},
		metakey: {
			type: String,
			required: true,
			validate: [
				validators.isLength(1, 50), /*validate length is between 1 to 50*/
			],
		},
		metadescription: {
			type: String,
			required: true,
			validate: [
				validators.isLength(1, 50), /*validate length is between 1 to 50*/
			],
		},
		logo: {
			type: String,
			required: true,
		},
		file: {
			type: String,
			required: true,
		},
		moderatorId: {
			type: Schema.Types.ObjectId,
			ref: 'Moderator',
		},
	}, {
		collection: 'siteinfo', // table name
		toObject: {
			virtuals: true, // enable virtual fields
		},
		toJSON: {
			virtuals: true, // enable virtual fields
		},
	}).plugin(timestamps).plugin(findOrCreate).plugin(mongoosePaginate);
	/*InfoSchema.virtual('file').get(function(){
		return path.basename(this.logo);
	});*/

var SiteInfo = module.exports = mongoose.model('SiteInfo', InfoSchema);

/*// create if email not exists
SiteInfo.create({ title: "Mobiteach", metakey: "Mobiteach", metadescription: "Mobiteach", logo: "/assets/images/logo-3.png", file: "logo-3.png", }, function(err, siteinfo){});*/