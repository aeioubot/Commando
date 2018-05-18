const { stripIndents, oneLine } = require('common-tags');
const Command = require('../base');
const disambiguation = require('../../util').disambiguation;

function getTotalLength(arr) {
	let tot = 0;
	if(arr.length === 0) return 0;
	for(let str of arr) {
		tot += str.length;
	}
	return tot;
}

function getUnder2kMessages(array) {
	const toReturn = [];
	while(array.length !== 0) {
		const current = [];
		while(getTotalLength(current) < 2000 && array[0] !== undefined) {
			current.push(array.splice(0, 1)[0]);
		}
		if(getTotalLength(current) > 2000) {
			array.unshift(current.pop());
		}
		toReturn.push(current.join(''));
	}
	return toReturn;
}

module.exports = class HelpCommand extends Command {
	constructor(client) {
		super(client, {
			name: 'help',
			group: 'util',
			memberName: 'help',
			aliases: ['commands'],
			description: 'Displays a list of available commands, or detailed information for a specified command.',
			details: oneLine`
				The command may be part of a command name or a whole command name.
				If it isn't specified, all available commands will be listed.
			`,
			examples: ['help', 'help prefix'],
			guarded: true,
			args: [
				{
					key: 'command',
					prompt: 'Which command would you like to view the help for?',
					type: 'string',
					default: '',
				},
			],
		});
	}

	async run(msg, args) { // eslint-disable-line complexity
		const commands = this.client.registry.findCommands(args.command, false, msg);
		const showAll = args.command && args.command.toLowerCase() === 'all';
		if(args.command && !showAll) {
			if(commands.length === 1) {
				let help = stripIndents`
					${oneLine`
						__Command **${commands[0].name}**:__ ${commands[0].description}
						${commands[0].guildOnly ? ' (Usable only in servers)' : ''}
					`}

					**Format:** ${msg.anyUsage(`${commands[0].name}${commands[0].format ? ` ${commands[0].format}` : ''}`)}
				`;
				if(commands[0].aliases.length > 0) help += `\n**Aliases:** ${commands[0].aliases.join(', ')}`;
				help += `\n${oneLine`
					**Group:** ${commands[0].group.name}
					(\`${commands[0].groupID}:${commands[0].memberName}\`)
				`}`;
				if(commands[0].details) help += `\n**Details:** ${commands[0].details}`;
				if(commands[0].examples) help += `\n**Examples:**\n${commands[0].examples.join('\n')}`;

				const messages = [];
				try {
					messages.push(await msg.direct(help));
					if(msg.channel.type !== 'dm') messages.push(await msg.reply('Sent you a DM with information.'));
				} catch(err) {
					messages.push(await msg.reply('Unable to send you the help DM. You probably have DMs disabled.'));
				}
				return messages;
			} else if(commands.length > 1) {
				return msg.reply(disambiguation(commands, 'commands'));
			} else {
				return msg.reply(
					`Unable to identify command. Use ${msg.usage(
						null, msg.channel.type === 'dm' ? null : undefined, msg.channel.type === 'dm' ? null : undefined
					)} to view the list of all commands.`
				);
			}
		} else {
			try {
				const allGroups = [
					/* eslint-disable */
					stripIndents`
					To run a command in ${msg.guild ? `**${msg.guild}**` : 'any server'}, use the prefix \`${msg.guild ? msg.guild.commandPrefix : `@${this.client.user.tag}`}\`.
					For example, \`${msg.guild ? `${msg.guild.commandPrefix}help` : `@${this.client.user.tag} help`}\`.
					
					To run a command in this DM, simply say the command with no prefix.

					Use ${this.usage('<command>', null, null)} in this DM to view detailed information about a specific command.
					`,
					/* eslint-enable */
				];
				for(let group of this.client.registry.groups) {
					group = group[1];
					if(['utility', 'owner commands', 'commands'].includes(group.name.toLowerCase())) continue;
					let thisGroup = ['```md', `#===${group.name.toUpperCase()}===#\n`];
					for(let command of group.commands) {
						command = command[1];
						thisGroup.push(`${`<${command.name.toUpperCase()}>`.padEnd(10)} // ${command.description}`);
					}
					thisGroup.push('```');
					allGroups.push(thisGroup.join('\n'));
				}
				const toSends = getUnder2kMessages(allGroups);
				for(let compliants of toSends) {
					// eslint-disable-next-line
					await msg.direct(compliants);
				}
				return undefined;
			} catch(err) {
				return msg.reply('Unable to send you the help DM. You probably have DMs disabled.');
			}
		}
	}
};
