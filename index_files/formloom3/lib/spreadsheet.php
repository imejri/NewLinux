<?php
//=====================================================//
//
// ! YABDAB - GOOGLE SHEET CLASS v.3.0.7
// - MODIFIED: 06-08-2015 08:59:12 am
// - author: Mike Yrabedra
// - (c)2011-2015 Yabdab Inc. All rights reserved.
//
//  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY
//  EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
//  MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL
//  THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
//  SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT
//  OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION)
//  HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR
//  TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
//  EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
//
//=====================================================//
    
require_once realpath(dirname(__FILE__) . '/googlebase.php');
require_once realpath(dirname(__FILE__) . '/Google/autoload.php');

class Spreadsheet {
	
	private $client;
	private $token;
	private $access_token;
	private $client_id = '286978819740-ff8ksbm4cq6dvil352f4n4vktu87skc8.apps.googleusercontent.com'; //Client ID
	private $service_account_name = '286978819740-ff8ksbm4cq6dvil352f4n4vktu87skc8@developer.gserviceaccount.com'; //Email Address
	private $key_file_location = 'rw-formloom3-plugin-def1db2fb580.p12'; //key.p12
	
	// The file ID was copied from a URL while editing the sheet in Chrome
	private $file_id;
	
	public function __construct($file_id) {
		$this->file_id = $file_id;
		$this->authenticate();
	}
 
	/**
	*	Authenticate with Google API via our Service Account
	*/
	public function authenticate() {
		
		$this->client = new Google_Client();
		$this->client->setApplicationName("Formloom 3");
		
		if (!empty($this->token)) {
		  $this->client->setAccessToken($this->token);
		}
		
		$key = file_get_contents(dirname(__FILE__) . DIRECTORY_SEPARATOR .$this->key_file_location);
		$cred = new Google_Auth_AssertionCredentials(
		    $this->service_account_name,
		    array('https://spreadsheets.google.com/feeds'),
		    $key
		);
		$this->client->setAssertionCredentials($cred);
		if ($this->client->getAuth()->isAccessTokenExpired()) {
		  $this->client->getAuth()->refreshTokenWithAssertion($cred);
		}
		$this->token = $this->client->getAccessToken();
		
		// Get access token for spreadsheets API calls
		$resultArray = json_decode($this->token);
		$this->access_token = $resultArray->access_token;
		
	}
	
	/**
	*	Add Table Row
	*/
	public function add($data) {
		
		$url = "https://spreadsheets.google.com/feeds/list/$this->file_id/1/private/full";
		$method = 'POST';
		$headers = array("Authorization" => "Bearer {$this->access_token}", 'Content-Type' => 'application/atom+xml');
		
		$postBody = '<entry xmlns="http://www.w3.org/2005/Atom" xmlns:gsx="http://schemas.google.com/spreadsheets/2006/extended">';
		foreach($data as $key => $value) {
			$key = $this->formatColumnID($key);
			$postBody .= "<gsx:$key><![CDATA[$value]]></gsx:$key>";
		}
		$postBody .= '</entry>';		
		
		$req = new Google_Http_Request($url, $method, $headers, $postBody);
		$curl = new Google_IO_Curl($this->client);
		$results = $curl->executeRequest($req);
        
        $rs = $results[0];
        
        if(stristr($rs, "http"))
        {
            return "good";
        }else{
            return "Google Error : {$rs}";
        }
		
	}
    
    /**
    *	Read Table Data for Debugging
    */
    public function read() {
        $url = "https://spreadsheets.google.com/feeds/list/$this->file_id/1/private/full";
		$method = 'GET';
		$headers = array("Authorization" => "Bearer {$this->access_token}");
		$req = new Google_Http_Request($url, $method, $headers);
		$curl = new Google_IO_Curl($this->client);
		$results = $curl->executeRequest($req);
		echo '<h2>Table Data</h2><pre>';
		var_dump($results);
		echo '</pre>';
    }
    
    /**
    *	Remove illegal chars from key name
    */
    private function formatColumnID($val) {
		return preg_replace("/[^a-zA-Z0-9.-]/", "", strtolower($val));
	}
 
}