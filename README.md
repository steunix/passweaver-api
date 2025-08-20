# PassWeaver API

PassWeaver API is an enterprise-scale, collaborative secrets manager API. It allows to safely store and retreive sensitive data, such as sites passwords, API credentials, network passwords... in other words any information that needs to be encrypted, protected, monitored, shared.

It's **collaborative**, meaning that users are organized in groups and protected items are organized in folders: different permissions can be defined for each folder for each user group.

It uses strong encryption algorithms, and can integrate with cloud-based Key Management System (Google, at the time of writing).

## About

PassWeaver API is a full Rest API, it has no GUI or CLI: you can easily integrate it with your systems and let it act as a centralized password vault. Instead, for a ready to use, simple and complete Web GUI, have a look at https://github.com/steunix/passweaver-gui

PassWeaver API is a NodeJS application, written in Javascript (ES6), released under MIT license, built on top of Express 5 framework.

# Documentation

Please have a look at https://steunix.github.io/passweaver-api/ for full documentation.

Rest API documentation can be found at https://steunix.github.io/passweaver-api/apidoc/index.html