const express = require("express");
const app = express();
let morgan = require("morgan");
let cors = require("cors");
const bodyParser = require("body-parser");
app.use(bodyParser.raw({ type: "*/*" }));
app.use(morgan("combined"));
app.use(cors());

let users = new Map();
let tokens = new Map();
let channels = new Map();

app.get("/sourcecode", (req, res) => {
    res.send(
        require("fs")
            .readFileSync(__filename)
            .toString()
    );
});

let getUsernameByToken = (tokens, targetToken) => {
    for (let [k, v] of tokens.entries()) {
        if (v === targetToken) {
            return k;
        }
    }
};

let checkMissingUsername = (username, res) => {
    if (username === undefined) {
        res.send({ success: false, reason: "username field missing" });
        return true;
    }
    return false;
};

let checkMissingPassword = (password, res) => {
    if (password === undefined) {
        res.send({ success: false, reason: "password field missing" });
        return true;
    }
    return false;
};

let checkSignupExistedRegisteredUser = (username, users, res) => {
    if (users.has(username)) {
        res.send({ success: false, reason: "Username exists" });
        return true;
    }
    return false;
};

let signup = (body, users, res) => {
    users.set(body.username, body.password);
    res.send({ success: true });
};

let checkLoginNotExisteduser = (username, users, res) => {
    if (!users.has(username)) {
        res.send({ success: false, reason: "User does not exist" });
        return true;
    }
    return false;
};

let checkPassword = (body, users, res) => {
    if (body.password === users.get(body.username)) {
        return true;
    }
    res.send({ success: false, reason: "Invalid password" });
    return false;
};

let login = (body, tokens, res) => {
    let token =
        body.username.substr(
            parseInt(Math.random() * body.username.length, 10) + 1,
            parseInt(Math.random() * body.username.length, 10) + 1
        ) +
        Date.parse(new Date()) +
        body.password.substr(
            parseInt(Math.random() * body.password.length, 10) + 1,
            parseInt(Math.random() * body.password.length, 10) + 1
        );
    tokens.set(body.username, token);
    res.send({ success: true, token: token });
};

let checkMissingToken = (token, res) => {
    if (token === undefined) {
        res.send({ success: false, reason: "token field missing" });
        return true;
    }
    return false;
}

let checkValidToken = (username, res) => {
    if (username !== undefined) {
        return true
    }
    res.send({ success: false, reason: "Invalid token" });
    return false;
}

let checkMissingChannelName = (channelName, res) => {
    if (channelName === undefined) {
        res.send({ success: false, reason: "channelName field missing" });
        return true;
    }
    return false;
}

let checkExistedChannel = (channelName, channels, res) => {
    if (channels.has(channelName)) {
        res.send({ success: false, reason: "Channel already exists" });
        return true;
    }
    return false;
}

let createChannel = (channelName, channels, username, res) => {
    channels.set(channelName, {
        creator: username,
        peopleInChannel: new Set(),
        banned: new Set(),
        messages: []
    });
    res.send({ success: true });
}

let checkChannelNotExist = (channelName, channels, res) => {
    if (!channels.has(channelName)) {
        res.send({ success: false, reason: "Channel does not exist" });
        return true;
    }
    return false;
}

let checkUserIsBanned = (channelName, channels, username, res) => {
    if (channels.get(channelName).banned.has(username)) {
        res.send({ success: false, reason: "User is banned" });
        return true;
    }
    return false;
}

let checkUserInChannel = (channelName, channels, username, res) => {
    if (channels.get(channelName).peopleInChannel.has(username)) {
        res.send({ success: false, reason: "User has already joined" });
        return true;
    }
    return false;
}

let joinChannel = (channelName, channels, username, res) => {
    channels.get(channelName).peopleInChannel.add(username);
    res.send({ success: true });
}

let checkUserNotInChannel = (channelName, channels, username, res, kickingTarget) => {
    if (!channels.get(channelName).peopleInChannel.has(username)) {
        if (kickingTarget) {
            res.send({ success: false, reason: "Target user is not in this Channel" });
        } else {
            res.send({ success: false, reason: "User is not part of this channel" });
        }
        return true;
    }
    return false;
}

let leaveChannel = (channelName, channels, username, res) => {
    channels.get(channelName).peopleInChannel.delete(username);
    res.send({ success: true });
}

let getJoinedUsers = (channelName, channels, res) => {
    let joinedUsers = Array.from(channels.get(channelName).peopleInChannel);
    res.send({ success: true, joined: joinedUsers });
}

let checkIsChannelCreator = (channelName, channels, username, res) => {
    if (channels.get(channelName).creator === username) {
        return true;
    }
    res.send({ success: false, reason: "Channel not owned by user" });
    return false;
}

let deleteChannel = (channelName, channels, res) => {
    channels.delete(channelName);
    res.send({ success: true });
}

let checkMissingKickingTarget = (targetUser, res) => {
    if (targetUser === undefined) {
        res.send({ success: false, reason: "target field missing" });
        return true;
    }
    return false;
}

let kickTargetUser = (channelName, channels, targetUser, res) => {
    channels.get(channelName).peopleInChannel.delete(targetUser);
    res.send({ success: true });
}

let banTargetUser = (channelName, channels, targetUser, res) => {
    channels.get(channelName).banned.add(targetUser);
    res.send({success: true});
}

let checkMissingContents = (contents, res) => {
    if(contents === undefined) {
        res.send({success: false, reason: "contents field missing"});
        return true;
    }
    return false;
}

let sendMessageInChannel = (body, channels, username, res) => {
    channels.get(body.channelName).messages.push({"from": username, "contents": body.contents});
    res.send({success: true});
}

let getAllMessages = (channelName, channels, res) => {
    let allMessages = channels.get(channelName).messages;
    res.send({success: true, "messages": allMessages});
}

// method: POST, path: /signup
app.post("/signup", (req, res) => {
    let parsedRequestBody = JSON.parse(req.body);
    if (checkMissingUsername(parsedRequestBody.username, res)) {
        return;
    }
    if (checkMissingPassword(parsedRequestBody.password, res)) {
        return;
    }
    if (checkSignupExistedRegisteredUser(parsedRequestBody.username, users, res)) {
        return;
    }
    signup(parsedRequestBody, users, res);
});

// method: POST, path: /login
app.post("/login", (req, res) => {
    let parsedRequestBody = JSON.parse(req.body);
    if (checkMissingUsername(parsedRequestBody.username, res)) {
        return;
    }
    if (checkMissingPassword(parsedRequestBody.password, res)) {
        return;
    }
    if (checkLoginNotExisteduser(parsedRequestBody.username, users, res)) {
        return;
    }
    if (!checkPassword(parsedRequestBody, users, res)) {
        return;
    }
    login(parsedRequestBody, tokens, res);
});

// method: POST, path: /create-channel
app.post("/create-channel", (req, res) => {
    let requestToken = req.headers.token;
    if (checkMissingToken(requestToken, res)) { return; }
    let requestUsername = getUsernameByToken(tokens, requestToken);
    if (!checkValidToken(requestUsername, res)) { return; }
    let channelName = JSON.parse(req.body).channelName;
    if (checkMissingChannelName(channelName, res)) { return; }
    if (checkExistedChannel(channelName, channels, res)) { return; }
    createChannel(channelName, channels, requestUsername, res);
});

// method: POST, path: /join-channel
app.post("/join-channel", (req, res) => {
    let requestToken = req.headers.token;
    if (checkMissingToken(requestToken, res)) { return; }
    let requestUsername = getUsernameByToken(tokens, requestToken);
    if (!checkValidToken(requestUsername, res)) { return; }
    let channelName = JSON.parse(req.body).channelName;
    if (checkMissingChannelName(channelName, res)) { return; }
    if (checkChannelNotExist(channelName, channels, res)) { return; }
    if (checkUserIsBanned(channelName, channels, requestUsername, res)) { return; }
    if (checkUserInChannel(channelName, channels, requestUsername, res)) { return; }
    joinChannel(channelName, channels, requestUsername, res);
});

// method: POST, path: /leave-channel
app.post("/leave-channel", (req, res) => {
    let requestToken = req.headers.token;
    if (checkMissingToken(requestToken, res)) { return; }
    let requestUsername = getUsernameByToken(tokens, requestToken);
    if (!checkValidToken(requestUsername, res)) { return; }
    let channelName = JSON.parse(req.body).channelName;
    if (checkMissingChannelName(channelName, res)) { return; }
    if (checkChannelNotExist(channelName, channels, res)) { return; }
    if (checkUserNotInChannel(channelName, channels, requestUsername, res, false)) { return; }
    leaveChannel(channelName, channels, requestUsername, res);
});

// method: GET, path: /joined
app.get("/joined", (req, res) => {
    let requestToken = req.headers.token;
    if (checkMissingToken(requestToken, res)) { return; }
    let requestUsername = getUsernameByToken(tokens, requestToken);
    if (!checkValidToken(requestUsername, res)) { return; }
    let channelName = req.query.channelName;
    if (checkMissingChannelName(channelName, res)) { return; }
    if (checkChannelNotExist(channelName, channels, res)) { return; }
    if (checkUserNotInChannel(channelName, channels, requestUsername, res, false)) { return; }
    getJoinedUsers(channelName, channels, res);
});

// method: POST, path: /delete
app.post("/delete", (req, res) => {
    let requestToken = req.headers.token;
    if (checkMissingToken(requestToken, res)) { return; }
    let requestUsername = getUsernameByToken(tokens, requestToken);
    if (!checkValidToken(requestUsername, res)) { return; }
    let channelName = JSON.parse(req.body).channelName;
    if (checkMissingChannelName(channelName, res)) { return; }
    if (checkChannelNotExist(channelName, channels, res)) { return; }
    if (!checkIsChannelCreator(channelName, channels, requestUsername, res)) { return; }
    deleteChannel(channelName, channels, res);
});

// method: POST, path: /kick
app.post("/kick", (req, res) => {
    let requestToken = req.headers.token;
    if (checkMissingToken(requestToken, res)) { return; }
    let requestUsername = getUsernameByToken(tokens, requestToken);
    if (!checkValidToken(requestUsername, res)) { return; }

    let parsedRequestBody = JSON.parse(req.body);
    let channelName = parsedRequestBody.channelName;
    let targetUser = parsedRequestBody.target;
    if (checkMissingChannelName(channelName, res)) { return; }
    if (checkChannelNotExist(channelName, channels, res)) { return; }
    if (checkMissingKickingTarget(targetUser, res)) { return; }
    if (checkUserNotInChannel(channelName, channels, targetUser, res, true)) { return; }
    if (!checkIsChannelCreator(channelName, channels, requestUsername, res)) { return; }
    kickTargetUser(channelName, channels, targetUser, res);
});

// method: POST, path: /ban
app.post("/ban", (req, res) => {
    let requestToken = req.headers.token;
    if (checkMissingToken(requestToken, res)) { return; }
    let requestUsername = getUsernameByToken(tokens, requestToken);
    if (!checkValidToken(requestUsername, res)) { return; }
    let parsedRequestBody = JSON.parse(req.body);
    let channelName = parsedRequestBody.channelName;
    let targetUser = parsedRequestBody.target;
    if (checkMissingChannelName(channelName, res)) { return; }
    if (checkMissingKickingTarget(targetUser, res)) { return; }
    if (checkChannelNotExist(channelName, channels, res)) { return; }
    if (!checkIsChannelCreator(channelName, channels, requestUsername, res)) { return; }
    // if (checkUserNotInChannel(channelName, channels, targetUser, res, true)) { return; }
    banTargetUser(channelName, channels, targetUser, res);
});

// method: POST, path: /message
app.post("/message", (req, res) => {
    let requestToken = req.headers.token;
    if (checkMissingToken(requestToken, res)) { return; }
    let requestUsername = getUsernameByToken(tokens, requestToken);
    if (!checkValidToken(requestUsername, res)) { return; }
    let parsedRequestBody = JSON.parse(req.body);
    let channelName = parsedRequestBody.channelName;
    let contents = parsedRequestBody.contents;
    if (checkMissingChannelName(channelName, res)) { return; }
    if(checkMissingContents(contents, res)) {return;}
    // Testcase of checking existed channelName is missing here.
    if (!channels.has(channelName) || !channels.get(channelName).peopleInChannel.has(requestUsername)) { 
        res.send({ success: false, reason: "User is not part of this channel" });
        return; 
    }
    sendMessageInChannel(parsedRequestBody, channels, requestUsername, res);
});

// method: GET, path: /messages
app.get("/messages", (req, res) => {
    let requestToken = req.headers.token;
    if (checkMissingToken(requestToken, res)) { return; }
    let requestUsername = getUsernameByToken(tokens, requestToken);
    if (!checkValidToken(requestUsername, res)) { return; }
    let channelName = req.query.channelName;
    if (checkMissingChannelName(channelName, res)) { return; }
    if (checkChannelNotExist(channelName, channels, res)) { return; }
    if (checkUserNotInChannel(channelName, channels, requestUsername, res, false)) { return; }
    getAllMessages(channelName, channels, res);
});

// listen for requests :)
const listener = app.listen(process.env.PORT, () => {
    console.log("Your app is listening on port " + listener.address().port);
});
