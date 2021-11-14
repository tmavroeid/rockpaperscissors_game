// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract RockPaperScissors is Ownable{

    ERC20 private _usdc;
    
    struct Play {
        uint256 bet; // For storing the wager in that particular play
        uint choice; //holds the players choice
        address opponent; // To store the opponent's address
    }

    struct Game {
        address playerOne;
        address playerTwo;
        uint256 timestamp; 
        uint256 duration;// The duration of each game in seconds
        Stage  gameStage;
        address winner;
    }

    enum Stage {
        NotStarted,
        Started,
        Filled,
        Completed
    }

    // Initial game stage
    Stage constant defaultStage = Stage.NotStarted;

    bool private running;
    mapping (address => uint256) public balances; // For storing the player balance in contract
    mapping (address => Play) public moves; //For storing the choice of each user
    mapping (bytes32 => Game) public games;
    // mapping (bytes32 => Game) public plays;

    event PlayerOnePlayed(address indexed playerAddress, uint256 amount);
    event PlayerTwoPlayed(address indexed playerAddress, uint256 amount);
    event Deposited(address indexed from, uint256 value);
    event Withdrawed(address indexed to, uint256 value);
    event Started(address indexed player1, address indexed player2); 
    event Completed(address indexed winnerAddress, uint256 choice);
    event Tie(address indexed playerAddressOne,address indexed playerAddressTwo);
    event ContractStarted(address indexed caller);
    event ContractStopped(address indexed caller);

    modifier isWorking {
        require(running, "Contract is Stopped");
        _;
    }

    modifier isStopped {
        require(!running, "Contract is Running");
        _;
    }

    function stopContract() public onlyOwner isWorking{
        running = false;
        emit ContractStopped(msg.sender);
    }

    function startContract() public onlyOwner isStopped{
        running = true;
        emit ContractStarted(msg.sender);
    }

    constructor(ERC20 token) Ownable(){
        _usdc = token;
        running = true;
    }

    function startGame(address _opponent, string memory _secretPhrase, uint256 _duration) external payable returns(bool status){
        bytes32 hashValue = keccak256(abi.encodePacked(_secretPhrase));
        games[hashValue] = Game({playerOne: msg.sender, playerTwo: _opponent, timestamp: block.timestamp, duration: _duration, gameStage: Stage.Started, winner: address(0)});
        emit Started(msg.sender, _opponent);
        return true;
    }

    function deposit(uint256 _amount) external returns(bool){
        require(_amount > 0, "USDC tokens should be more than zero");
        uint256 usdc_userBalance = _usdc.balanceOf(msg.sender);
        // check amount is lower than balance
        require(_amount < usdc_userBalance, 'The bet amount should be less than total USDC balance');
        // transfer the amount of USDC to the contract 
        _usdc.transferFrom(msg.sender, address(this), _amount);
        balances[msg.sender] = _amount;

        emit Deposited(msg.sender, _amount);
        return true;
    }

    function playerOnePlay(uint _choice, address _opponent, string memory _secretPhrase) public isWorking payable returns(bool){
        require(balances[msg.sender] > 0, "The player should deposit a bet");
        bytes32 hashValue = keccak256(abi.encodePacked(_secretPhrase));
        require(msg.sender != address(0), "Please choose another address");
        require(games[hashValue].playerOne == msg.sender, "This player is not permitted to play in this game");
        require(balances[msg.sender] > 0, "USDC tokens should be more than zero");
        // player's move details are added
        moves[msg.sender] = Play({bet: balances[msg.sender], choice: _choice, opponent: _opponent});

        emit PlayerOnePlayed(msg.sender, balances[msg.sender]);
        return true;
    }

    function playerTwoPlay(uint _choice, address _opponent, string memory _secretPhrase) public isWorking payable returns(bool){
        require(balances[msg.sender] > 0, "The player should deposit a bet");
        // check that the following is the same as keccak256(abi.encodePacked(_secretPhrase, _opponent, msg.sender))
        bytes32 hashValue = keccak256(abi.encodePacked(_secretPhrase));
        require(msg.sender != address(0), "Please choose another address");
        require(games[hashValue].playerTwo == msg.sender, "This player is not permitted to play in this game");
        require(balances[msg.sender] > 0, "USDC tokens should be more than zero");
        // player's move details are added
        moves[msg.sender] = Play({bet: balances[msg.sender], choice: _choice, opponent: _opponent});
        // change game stage to filled 
        games[hashValue].gameStage = Stage.Filled;

        emit PlayerTwoPlayed(msg.sender, balances[msg.sender]);
        return true;

    }

    function declareWinner(string memory _secretPhrase, address _opponent) public isWorking returns(bool){
        // calculate hashvalue to retrieve game
        bytes32 hashValue = keccak256(abi.encodePacked(_secretPhrase));
        address playerTwo = games[hashValue].playerTwo;
        address playerOne = games[hashValue].playerOne;
        require(playerOne==msg.sender||playerTwo==msg.sender, "The sender is not a player");
        // check player 2 has played
        require(moves[games[hashValue].playerTwo].choice != 0, "Player 2 did not choose any move");
        // check if game is expired
        uint256 total_time = games[hashValue].timestamp + games[hashValue].duration;
        require(total_time > block.timestamp, 'The game is expired');
        require(games[hashValue].gameStage == Stage.Filled, 'The game is not filled');
        if (((moves[playerOne].choice+1) % 3) == moves[playerTwo].choice){
            games[hashValue].winner = playerTwo;
            balances[playerTwo] = balances[playerOne];
            balances[playerOne] = 0;
            emit Completed(playerTwo, moves[playerTwo].choice);
        }else if (moves[playerOne].choice == moves[playerTwo].choice){
            emit Tie(msg.sender,_opponent);
        }else{
            games[hashValue].winner = playerOne;
            balances[playerOne] = balances[playerTwo];
            balances[playerTwo] = 0;
            emit Completed(playerOne, moves[playerOne].choice);
        }
        // Cleaning up
        games[hashValue].playerOne = address(0);
        games[hashValue].playerTwo = address(0);
        games[hashValue].duration = 0;
        games[hashValue].timestamp = 0;
        games[hashValue].gameStage = Stage.Completed;
        return true;
    }

    function withdrawPrize(string memory _secretPhrase) public isWorking returns(bool){
        bytes32 hashvalue = keccak256(abi.encodePacked(_secretPhrase));
        require(games[hashvalue].winner == msg.sender, "You have to win to withdraw the prize");
        require(balances[msg.sender] > 0, "Zero cant be withdrawn");
        uint256 amount = balances[msg.sender];
        balances[msg.sender] = 0;
        // transfer the amount of USDC from contract to the winner 
        if(_usdc.transfer(msg.sender, amount)){
            emit Withdrawed(msg.sender, amount);
        }else{
            revert("Unable to transfer USDC");
        }
        
        return true;
    }

}