pragma solidity 0.4.24;

import "@aragon/os/contracts/factory/DAOFactory.sol";
import "@aragon/os/contracts/kernel/Kernel.sol";
import "@aragon/os/contracts/acl/ACL.sol";
import "@aragon/apps-shared-minime/contracts/MiniMeToken.sol";

import "@aragon/id/contracts/IFIFSResolvingRegistrar.sol";

import "./Voting.sol";
import "@aragon/apps-vault/contracts/Vault.sol";
import "@aragon/apps-token-manager/contracts/TokenManager.sol";
import "@aragon/apps-finance/contracts/Finance.sol";

import "@aragon/os/contracts/common/IsContract.sol";

import "@aragon/kits-base/contracts/KitBase.sol";


contract EnigmaDemocracyKit is KitBase, IsContract {
    uint256 private constant MAX_UINT256 = uint256(-1);

    MiniMeTokenFactory public minimeFac;
    IFIFSResolvingRegistrar public aragonID;
    bytes32[4] public appIds;

    // ensure alphabetic order
    enum Apps { Finance, TokenManager, Vault, Voting }

    event DeployToken(address token);

    constructor(
        DAOFactory _fac,
        ENS _ens,
        MiniMeTokenFactory _minimeFac,
        IFIFSResolvingRegistrar _aragonID,
        bytes32[4] _appIds
    )
        KitBase(_fac, _ens)
        public
    {
        require(isContract(address(_fac.regFactory())));

        minimeFac = _minimeFac;
        aragonID = _aragonID;
        appIds = _appIds;
    }

    function newInstance(
        string name,
        string symbol,
        address[] holders,
        uint256[] stakes,
        uint64 supportNeeded,
        uint64 minAcceptanceQuorum,
        uint64 voteDuration
    )
        public
    {
        require(holders.length == stakes.length);

        Kernel dao = fac.newDAO(this);

        ACL acl = ACL(dao.acl());

        acl.createPermission(this, dao, dao.APP_MANAGER_ROLE(), this);

        // deploy apps
        Voting voting = deployApps(dao, acl);
        MiniMeToken token = deployTokenManager(dao, acl, voting, name, symbol, holders, stakes);

        voting.initialize(
            token,
            supportNeeded,
            minAcceptanceQuorum,
            voteDuration
        );

        // EVMScriptRegistry permissions
        EVMScriptRegistry reg = EVMScriptRegistry(acl.getEVMScriptRegistry());
        acl.createPermission(voting, reg, reg.REGISTRY_ADD_EXECUTOR_ROLE(), voting);
        acl.createPermission(voting, reg, reg.REGISTRY_MANAGER_ROLE(), voting);

        // clean-up
        cleanupDAOPermissions(dao, acl, voting);

        registerAragonID(name, dao);
        emit DeployInstance(dao);

    }

    /**
     * @dev Split to avoid stack too deep issue
     */
    function deployApps(Kernel dao, ACL acl) internal returns (Voting voting) {
        voting = Voting(
            dao.newAppInstance(
                appIds[uint8(Apps.Voting)],
                latestVersionAppBase(appIds[uint8(Apps.Voting)])
            )
        );
        emit InstalledApp(voting, appIds[uint8(Apps.Voting)]);

        Vault vault = Vault(
            dao.newAppInstance(
                appIds[uint8(Apps.Vault)],
                latestVersionAppBase(appIds[uint8(Apps.Vault)]),
                new bytes(0),
                true
            )
        );
        emit InstalledApp(vault, appIds[uint8(Apps.Vault)]);

        Finance finance = Finance(
            dao.newAppInstance(
                appIds[uint8(Apps.Finance)],
                latestVersionAppBase(appIds[uint8(Apps.Finance)])
            )
        );
        emit InstalledApp(finance, appIds[uint8(Apps.Finance)]);

        acl.createPermission(voting, voting, voting.MODIFY_QUORUM_ROLE(), voting);
        // burn support modification permission
        acl.createBurnedPermission(voting, voting.MODIFY_SUPPORT_ROLE());
        acl.createPermission(finance, vault, vault.TRANSFER_ROLE(), voting);
        acl.createPermission(voting, finance, finance.CREATE_PAYMENTS_ROLE(), voting);
        acl.createPermission(voting, finance, finance.EXECUTE_PAYMENTS_ROLE(), voting);
        acl.createPermission(voting, finance, finance.MANAGE_PAYMENTS_ROLE(), voting);

        vault.initialize();
        finance.initialize(vault, 30 days);
        // Voting will be initialized after next function, because it needs token
    }

    function deployTokenManager(
        Kernel dao,
        ACL acl,
        Voting voting,
        string name,
        string symbol,
        address[] holders,
        uint256[] stakes
    )
        internal
        returns (MiniMeToken token)
    {
        token = minimeFac.createCloneToken(
            MiniMeToken(address(0)),
            0,
            name,
            18,
            symbol,
            true
        );
        emit DeployToken(token);

        TokenManager tokenManager = TokenManager(
            dao.newAppInstance(
                appIds[uint8(Apps.TokenManager)],
                latestVersionAppBase(appIds[uint8(Apps.TokenManager)])
            )
        );
        emit InstalledApp(tokenManager, appIds[uint8(Apps.TokenManager)]);

        // Required for initializing the Token Manager
        token.changeController(tokenManager);

        // permissions
        acl.createPermission(tokenManager, voting, voting.CREATE_VOTES_ROLE(), voting);
        acl.createPermission(voting, tokenManager, tokenManager.ASSIGN_ROLE(), voting);
        acl.createPermission(voting, tokenManager, tokenManager.REVOKE_VESTINGS_ROLE(), voting);

        // App inits
        tokenManager.initialize(token, true, MAX_UINT256);

        // Set up the token stakes
        acl.createPermission(this, tokenManager, tokenManager.MINT_ROLE(), this);
        for (uint256 i = 0; i < holders.length; i++) {
            tokenManager.mint(holders[i], stakes[i]);
        }
        cleanupPermission(acl, voting, tokenManager, tokenManager.MINT_ROLE());
    }

    function registerAragonID(string name, address owner) internal {
        aragonID.register(keccak256(abi.encodePacked(name)), owner);
    }
}
