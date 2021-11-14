const { expect } = require('chai');
const { ethers } = require('hardhat');

describe("RockPaperScissors contract", function() {
    let instance;
    let usdc_instance;
    let accounts;
    let owner, addr1, addr2, addr3;
    
    before(async function() {
        accounts = await web3.eth.getAccounts();
        usdc_instance = await ethers.getContractFactory('USDC');
        usdc_instance = await usdc_instance.deploy();
        await usdc_instance.deployed();
        instance = await ethers.getContractFactory('RockPaperScissors');
        instance = await instance.deploy(usdc_instance.address);
        await instance.deployed();
    });

    beforeEach(async () => {
        [owner, addr1, addr2, addr3] = await ethers.getSigners();
    });

    it("can create RockPaperScissors contract", async() => {
        expect(await instance.owner()).to.equal(owner.address);
    });

    it("can make deposits of USDC", async() => {
        await usdc_instance.mint(addr1.address,2000)
        //approval is required in order to make the deposit
        await usdc_instance.connect(addr1).approve(instance.address,1000)
        await instance.connect(addr1).deposit(1000)
        let balance_after = await usdc_instance.balanceOf(addr1.address)
        await expect(balance_after.toNumber()).to.equal(1000);
    });
    
    it("cannot deposit 0 USDC", async() => {
        await usdc_instance.mint(addr1.address,2000)
        //approval is required in order to make the deposit
        await usdc_instance.connect(addr1).approve(instance.address,0)
        await expect(instance.connect(addr1).deposit(0)).to.be.revertedWith("USDC tokens should be more than zero");
    });

    it("cannot deposit more USDC than approved", async() => {
        await usdc_instance.mint(addr1.address,2000)
        //approval is required in order to make the deposit
        await usdc_instance.connect(addr1).approve(instance.address,1000)
        await expect(instance.connect(addr1).deposit(2000)).to.be.revertedWith("The allowance should be more or equal to the tokens to be transfered");
    });

    it("can start a game", async() => {
        await expect(instance.connect(addr1).startGame(addr2.address,'This is a secret game my friend', 5)).to.emit(instance, 'Started')
    });

    it("can playerOne make a choice", async() => {
        await instance.connect(addr1).startGame(addr2.address,'This is a secret game my friend', 5)
        await usdc_instance.mint(addr1.address,2000)
        //approval is required in order to make the deposit
        await usdc_instance.connect(addr1).approve(instance.address,1000)
        await instance.connect(addr1).deposit(1000)
        await expect(instance.connect(addr1).playerOnePlay(1, addr2.address, 'This is a secret game my friend')).to.emit(instance, 'PlayerOnePlayed')
    });

    it("can playerTwo make a choice", async() => {
        await instance.connect(addr1).startGame(addr2.address,'This is a secret game my friend', 3600)
        await usdc_instance.mint(addr2.address,2000)
        await usdc_instance.mint(addr1.address,2000)
        //approval is required in order to make the deposit
        await usdc_instance.connect(addr2).approve(instance.address,1000)
        await instance.connect(addr2).deposit(1000)
        await usdc_instance.connect(addr1).approve(instance.address,1000)
        await instance.connect(addr1).deposit(1000)
        await instance.connect(addr1).playerOnePlay(1, addr2.address, 'This is a secret game my friend')
        await expect(instance.connect(addr2).playerTwoPlay(1, addr1.address, 'This is a secret game my friend')).to.emit(instance, 'PlayerTwoPlayed')
    });

    it("can declare winner", async() => {
        await instance.connect(addr1).startGame(addr2.address,'This is a secret game my friend', 3600)
        await usdc_instance.mint(addr2.address,2000)
        await usdc_instance.mint(addr1.address,2000)
        //approval is required in order to make the deposit
        await usdc_instance.connect(addr2).approve(instance.address,1000)
        await instance.connect(addr2).deposit(1000)
        await usdc_instance.connect(addr1).approve(instance.address,1000)
        await instance.connect(addr1).deposit(1000)
        await instance.connect(addr1).playerOnePlay(2, addr2.address, 'This is a secret game my friend')
        await instance.connect(addr2).playerTwoPlay(1, addr1.address, 'This is a secret game my friend')
        await expect(instance.connect(addr1).declareWinner('This is a secret game my friend', addr2.address)).to.emit(instance, 'Completed').withArgs(addr1.address, 2);
    });

    it("can declare tie", async() => {
        await instance.connect(addr1).startGame(addr2.address,'This is a secret game my friend', 3600)
        await usdc_instance.mint(addr2.address,2000)
        await usdc_instance.mint(addr1.address,2000)
        //approval is required in order to make the deposit
        await usdc_instance.connect(addr2).approve(instance.address,1000)
        await instance.connect(addr2).deposit(1000)
        await usdc_instance.connect(addr1).approve(instance.address,1000)
        await instance.connect(addr1).deposit(1000)
        await instance.connect(addr1).playerOnePlay(1, addr2.address, 'This is a secret game my friend')
        await instance.connect(addr2).playerTwoPlay(1, addr1.address, 'This is a secret game my friend')
        await expect(instance.connect(addr1).declareWinner('This is a secret game my friend', addr2.address)).to.emit(instance, 'Tie').withArgs(addr1.address, addr2.address);
    });

    it("cannot declare winner if called from non player", async() => {
        await instance.connect(addr1).startGame(addr2.address,'This is a secret game my friend', 3600)
        await usdc_instance.mint(addr2.address,2000)
        await usdc_instance.mint(addr1.address,2000)
        //approval is required in order to make the deposit
        await usdc_instance.connect(addr2).approve(instance.address,1000)
        await instance.connect(addr2).deposit(1000)
        await usdc_instance.connect(addr1).approve(instance.address,1000)
        await instance.connect(addr1).deposit(1000)
        await instance.connect(addr1).playerOnePlay(2, addr2.address, 'This is a secret game my friend')
        await instance.connect(addr2).playerTwoPlay(1, addr1.address, 'This is a secret game my friend')
        await expect(instance.connect(addr3).declareWinner('This is a secret game my friend', addr2.address)).to.be.revertedWith("The sender is not a player");

    });

    it("can withdraw prize", async() => {
        await instance.connect(addr1).startGame(addr2.address,'This is a secret game my friend', 3600)
        await usdc_instance.mint(addr2.address,2000)
        await usdc_instance.mint(addr1.address,2000)
        //approval is required in order to make the deposit
        await usdc_instance.connect(addr2).approve(instance.address,1000)
        await instance.connect(addr2).deposit(1000)
        await usdc_instance.connect(addr1).approve(instance.address,1000)
        await instance.connect(addr1).deposit(1000)
        await instance.connect(addr1).playerOnePlay(2, addr2.address, 'This is a secret game my friend')
        await instance.connect(addr2).playerTwoPlay(1, addr1.address, 'This is a secret game my friend')
        await instance.connect(addr1).declareWinner('This is a secret game my friend', addr2.address)
        await expect(instance.connect(addr1).withdrawPrize('This is a secret game my friend')).to.emit(instance, 'Withdrawed').withArgs(addr1.address, 1000);
    });

    it("cannot withdraw prize if not winner", async() => {
        await instance.connect(addr1).startGame(addr2.address,'This is a secret game my friend', 3600)
        await usdc_instance.mint(addr2.address,2000)
        await usdc_instance.mint(addr1.address,2000)
        //approval is required in order to make the deposit
        await usdc_instance.connect(addr2).approve(instance.address,1000)
        await instance.connect(addr2).deposit(1000)
        await usdc_instance.connect(addr1).approve(instance.address,1000)
        await instance.connect(addr1).deposit(1000)
        await instance.connect(addr1).playerOnePlay(2, addr2.address, 'This is a secret game my friend')
        await instance.connect(addr2).playerTwoPlay(1, addr1.address, 'This is a secret game my friend')
        await instance.connect(addr1).declareWinner('This is a secret game my friend', addr2.address)
        await expect(instance.connect(addr2).withdrawPrize('This is a secret game my friend')).to.be.revertedWith("You have to win to withdraw the prize");
    });
});