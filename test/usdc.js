const { expect } = require('chai');
const { ethers } = require('hardhat');

describe("USDC contract", function() {
    let instance;
    let accounts;
    let owner, addr1, addr2;

    before(async function() {
        accounts = await web3.eth.getAccounts();
    });

    beforeEach(async () => {
        [owner, addr1, addr2] = await ethers.getSigners();
        instance = await ethers.getContractFactory('USDC');
        instance = await instance.deploy();
        await instance.deployed();
    });

    it("can add USDC name and symbol properly", async() => {
        expect(await instance.name.call()).to.equal("USD Coin");
        expect(await instance.symbol.call()).to.equal("USDC");
    });

    it("can get the decimals", async() => {
        expect(await instance.decimals.call()).to.equal(6);
    });

    it("can get the totalSupply", async() => {
        let totalSupply = await instance.connect(owner).totalSupply.call()
        expect(Number(totalSupply)).to.equal(100000000000000000000000000);
    });
    
    it("minting", async() => {
        // use account 1 since that account should have 0 
        let intial_balance = await instance.balanceOf(addr1.address);
        expect(intial_balance.toNumber()).to.equal(0);

        await instance.mint(addr1.address, 10);
        let after_balance = await instance.balanceOf(addr1.address);
        expect(after_balance.toNumber()).to.equal(10);
    });

    it("minting to 0 address", async()=>{
        await expect(instance.mint('0x0000000000000000000000000000000000000000', 100)).to.be.revertedWith('USDC: mint to the zero address');
    });

    it("minting 0 amount of USDC", async()=>{
        await expect(instance.mint(accounts[2], 0)).to.be.revertedWith("USDC: mint 0 amount");
    });

    it("burning", async() => {
        await instance.mint(accounts[1], 100);
        await instance.burn(accounts[1], 50);
        let balance = await instance.balanceOf(accounts[1]);
        expect(balance.toNumber()).to.equal(50);
    });

    it("burning to 0 address", async()=>{
        await expect(instance.burn('0x0000000000000000000000000000000000000000', 100)).to.be.revertedWith("USDC: burn from the zero address");
    });

    it("burning more amount of USDC than the amount of balance", async()=>{
        await expect(instance.burn(accounts[1], 10000)).to.be.revertedWith("USDC: burn amount exceeds balance");
    });

    it("can transfer USDC from one account to another", async()=>{
        await instance.mint(addr1.address, 200);
        await instance.connect(addr1).transfer(addr2.address,100);
        let balance = await instance.balanceOf(addr2.address);
        expect(balance.toNumber()).to.equal(100);
    });

    it("cannot transfer more USDC from one account than existing", async()=>{
        await instance.mint(addr2.address, 200);
        await expect(instance.connect(addr2).transfer(addr1.address,500)).to.be.revertedWith("USDC: tokens should be less/equal to the balance of the sender");
    });
    

    it("can approve allowance for an account", async()=>{
        await instance.mint(addr1.address, 1000);
        await expect(instance.connect(addr1).approve(addr2.address,1000)).to.emit(instance, 'Approval')
    });

    it("can transfer an amount of USDC on behalf of another account", async()=>{
        await instance.mint(addr1.address, 1000);
        await instance.connect(addr1).approve(addr2.address,1000);
        await expect(instance.connect(addr2).transferFrom(addr1.address,addr2.address, 1000)).to.emit(instance, 'Transfer');
    });

    it("cannot transfer an amount of USDC on behalf of another account that exceeds the allowance", async()=>{
        await instance.mint(addr1.address, 1000);
        await instance.connect(addr1).approve(addr2.address,1000);
        await expect(instance.connect(addr2).transferFrom(addr1.address,addr2.address, 2000)).to.be.revertedWith("The allowance should be more or equal to the tokens to be transfered");
    });

});