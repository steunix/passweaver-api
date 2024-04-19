# PassWeaver API

PassWeaver API is an enterprise-scale, collaborative secrets manager API. It allows to safely store and retreive sensitive data, such as sites passwords, API credentials, network passwords... in other words any information that needs to be encrypted, protected, monitored, shared.

It's **collaborative**, meaning that users are organized in groups and protected items are organized in folders: different permissions can be defined for each folder for each user group.

## What is it?

PassWeaver API is "only" a full API, there is no GUI or CLI: you can easily integrate it with your systems and let it act as a Password Centralized Vault. For a ready to use, simple yet complete Web GUI, have a look at https://github.com/steunix/passweaver-gui

PassWeaver API is a NodeJS application, released under MIT license, and it uses these (great) opensource libraries, among several others:
- Express, to manage HTTPS connections
- Prisma, for ORM and DB access

# Documentation

Please have a look to https://steunix.github.io/passweaver-api/ for full documentation

