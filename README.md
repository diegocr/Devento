Devento - Mozilla Extension
---------------

This restartless extension is designed to quickly turn your browser profile into development mode by enabling certain about:config preferences.

Additional features included are:

  - Uses an `AddonListener` to report when any extension get installed, enabled or disabled, uninstalled, etc.
  - Ability to forward any error throw in the Browser/Error Console to the Web Console, _which is something I found handy while developing a chrome-context app._
  - Remote logging, working by installing a console service listener which will forward messages to the specified _host:port_ in the options. Eg, `192.168.2.1:1234` If no port is specified, it'll fallback to `9999` - You can listen to messages by using [netcat](https://github.com/diegocr/netcat), for instance `nc -L -p 9999 -vv`

Since as pointed it's restartless, you can disable it at any time and all your preferences will be properly reset to their previous state.

Feel free to give it a try by installing it straight from this repo by using [GitHubExtIns](https://github.com/diegocr/GitHubExtIns)

