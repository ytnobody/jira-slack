const config = {
    "port": process.env.PORT ? process.env.PORT : 3400,
    "jira": {
        "team": process.env.JIRA_TEAM
    },
    "slack": {
        "url":      process.env.SLACK_WEBHOOK_URL,
        "channel":  process.env.SLACK_CHANNEL,
        "username": "JIRA issue comment",
        "icon_url": "https://cdn.iconverticons.com/files/png/a8dda0e01bb0031b_256x256.png"
    },
    "nameMap": {
        "toName": "@to_slackaccount"
    }
};

if (!config.jira.team || !config.slack.url) {
    process.stderr.write("env \"JIRA_TEAM\" and \"SLACK_WEBHOOK_URL\" is required.\n");
    process.exit(1);
}

if (!config.slack.channel) {
    config.slack.channel = "#random";
    process.stderr.write("env \"SLACK_CHANNEL\" is not specified. \nSLACK_CHANNEL will be \"#random\".\n");
    process.stderr.write("If you want to avoid this warning, please set env \"SLACK_CHANNEL\" when you start jira-slack.js\n");
}

const express     = require('express');
const bodyParser  = require('body-parser');
const sprintf     = require('sprintf-js').sprintf;
const slack       = require('slack-incoming-webhook');
const sendToSlack = slack(config.slack);

// instances
const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

// entrypoint
app.post('/entrypoint', (req, res) => {
    const data = req.body;
    if (data.comment) {
        const issueKey      = data.issue.key;
        const issueSummary  = data.issue.fields.summary;
        const author        = config.nameMap[data.comment.author.name] ? 
            config.nameMap[data.comment.author.name] :
            data.comment.author.name
        ;

        let comment   = data.comment.body;
        Object.keys(config.nameMap).forEach((from) => {
            let dest = config.nameMap[from];
            comment = comment.replace(new RegExp(from, "g"), dest);
        });      

        const message = sprintf(
            "https://%s.atlassian.net/browse/%s\n[%s] %s\n%s さんがコメントしました。\n%s", 
            config.jira.team, issueKey,
            issueKey, issueSummary,
            author, comment
        );
        sendToSlack(message);
    }
    res.json({"status": 200, "result": "ok"});
});

process.stderr.write("jira-slack listening port "+ config.port + " ...\n");
app.listen(config.port);