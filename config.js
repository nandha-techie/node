var nodemailer	=	require('nodemailer'),
	smtp		=	require('nodemailer-smtp-transport'),
	path 		=	require('path');
module.exports	=	{
	db: {
		name: "xperteamv25",
	},
	app: {
		name: "Mobiteach",
		baseUrl: "http://xperteam-test1-5.ideliver.top/",
	},
	mailOptions: {
		from: "admin@mobiteach.com",
		mail: "admin@mobiteach.com",
	},
	mail: {
		/*nodemail: nodemailer.createTransport({
			service: 'Gmail',
			auth: {
				user: 'developerinfo21@gmail.com',
				pass: 'asarer@123'
			}
		}),*/
		nodemail: nodemailer.createTransport(smtp({
			host: 'localhost',
			port: 25,
			tls:{
				rejectUnauthorized: false
			},
		})),
		options: {
			viewPath: path.join(__dirname + '/views/emails/'),
			extName: '.html'
		},
	},
	root: path.normalize(__dirname),
	secret_key: 'Expressr7+^!-xf)i1agch=^g_0%svl++wjo=z3x!gn%nq7+5mv7m_3h^Mobiteach',
	mongooseDebug: true,
};